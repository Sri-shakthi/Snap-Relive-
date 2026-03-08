import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { findUsersByFaceIds } from '../data-access/photos.dao.js';
import {
  findVideoUploadById,
  markVideoUploadFailed,
  markVideoUploadProcessed,
  replaceVideoFaceMatches
} from '../data-access/videos.dao.js';
import { config } from '../config/index.js';
import { downloadObjectToFile, putObjectBuffer } from './awsS3.js';
import { getFaceSearchResults, type VideoFaceSearchMatchRecord } from './awsRekognition.js';
import { getQueueService } from './queue.js';

const execFileAsync = promisify(execFile);

interface DedupedVideoMatch {
  videoUploadId: string;
  eventId: string;
  userId: string;
  timestampMs: number;
  similarity: number;
  boundingBox?: {
    width?: number;
    height?: number;
    left?: number;
    top?: number;
  };
}

const toPaddedBounds = (
  metadata: { width?: number; height?: number },
  boundingBox?: { width?: number; height?: number; left?: number; top?: number }
) => {
  if (!metadata.width || !metadata.height || !boundingBox) {
    return undefined;
  }

  const left = Math.max(0, Math.floor((boundingBox.left ?? 0) * metadata.width));
  const top = Math.max(0, Math.floor((boundingBox.top ?? 0) * metadata.height));
  const width = Math.max(1, Math.floor((boundingBox.width ?? 1) * metadata.width));
  const height = Math.max(1, Math.floor((boundingBox.height ?? 1) * metadata.height));
  const paddingX = Math.floor(width * 0.35);
  const paddingY = Math.floor(height * 0.35);
  const extractedLeft = Math.max(0, left - paddingX);
  const extractedTop = Math.max(0, top - paddingY);
  const extractedWidth = Math.min(metadata.width - extractedLeft, width + paddingX * 2);
  const extractedHeight = Math.min(metadata.height - extractedTop, height + paddingY * 2);

  if (extractedWidth <= 0 || extractedHeight <= 0) {
    return undefined;
  }

  return {
    left: extractedLeft,
    top: extractedTop,
    width: extractedWidth,
    height: extractedHeight
  };
};

const extractThumbnails = async (
  videoUpload: NonNullable<Awaited<ReturnType<typeof findVideoUploadById>>>,
  matches: DedupedVideoMatch[]
) => {
  if (matches.length === 0) {
    return new Map<string, string>();
  }

  const tempDir = await mkdtemp(join(tmpdir(), 'snapshots-video-'));
  const videoPath = join(tempDir, 'source-video');
  const uploadedKeysByUser = new Map<string, string>();

  try {
    await downloadObjectToFile({
      bucket: videoUpload.s3Bucket,
      s3Key: videoUpload.s3Key,
      filePath: videoPath
    });

    for (const match of matches) {
      try {
        const framePath = join(tempDir, `${match.userId}-${match.timestampMs}.jpg`);
        await execFileAsync(config.video.ffmpegPath, [
          '-y',
          '-ss',
          (match.timestampMs / 1000).toFixed(3),
          '-i',
          videoPath,
          '-frames:v',
          '1',
          '-q:v',
          '2',
          framePath
        ]);

        let image = sharp(framePath);
        const metadata = await image.metadata();
        const crop = toPaddedBounds(metadata, match.boundingBox);
        if (crop) {
          image = image.extract(crop);
        }

        const buffer = await image
          .resize(720, 720, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 86 })
          .toBuffer();

        const thumbnailS3Key = `uploads/videos/thumbnails/events/${match.eventId}/${match.videoUploadId}/${match.userId}-${match.timestampMs}.jpg`;
        await putObjectBuffer({
          bucket: videoUpload.s3Bucket,
          s3Key: thumbnailS3Key,
          body: buffer,
          contentType: 'image/jpeg'
        });

        uploadedKeysByUser.set(match.userId, thumbnailS3Key);
      } catch (error) {
        console.warn('Video thumbnail extraction failed', {
          videoUploadId: videoUpload.id,
          userId: match.userId,
          timestampMs: match.timestampMs,
          error
        });
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  return uploadedKeysByUser;
};

const dedupeMatchesByUser = async (eventId: string, videoUploadId: string, rawMatches: VideoFaceSearchMatchRecord[]) => {
  const uniqueFaceIds = [...new Set(rawMatches.flatMap((match) => (match.faceId ? [match.faceId] : [])))];
  const faceMappings = await findUsersByFaceIds(eventId, uniqueFaceIds);
  const usersByFaceId = new Map<string, Array<{ userId: string; similarity: number }>>();

  for (const mapping of faceMappings) {
    const faceId = mapping.rekognitionFaceId;
    if (!faceId) continue;
    const current = usersByFaceId.get(faceId) ?? [];
    current.push(
      ...mapping.photo.matches.map((item) => ({
        userId: item.userId,
        similarity: item.similarity
      }))
    );
    usersByFaceId.set(faceId, current);
  }

  const bestByUser = new Map<string, DedupedVideoMatch>();

  for (const rawMatch of rawMatches) {
    if (!rawMatch.faceId || !rawMatch.similarity) continue;
    const candidateUsers = usersByFaceId.get(rawMatch.faceId) ?? [];

    for (const candidate of candidateUsers) {
      const weightedSimilarity = Math.max(rawMatch.similarity, candidate.similarity);
      const previous = bestByUser.get(candidate.userId);
      if (
        !previous ||
        weightedSimilarity > previous.similarity ||
        (weightedSimilarity === previous.similarity && rawMatch.timestampMs < previous.timestampMs)
      ) {
        bestByUser.set(candidate.userId, {
          videoUploadId,
          eventId,
          userId: candidate.userId,
          timestampMs: rawMatch.timestampMs,
          similarity: weightedSimilarity,
          boundingBox: rawMatch.boundingBox
        });
      }
    }
  }

  return [...bestByUser.values()];
};

const loadAllFaceSearchResults = async (jobId: string) => {
  const matches: VideoFaceSearchMatchRecord[] = [];
  let nextToken: string | undefined;
  let status: string | undefined;
  let statusMessage: string | undefined;

  do {
    const page = await getFaceSearchResults({ jobId, nextToken });
    status = page.status;
    statusMessage = page.statusMessage;
    matches.push(...page.matches);
    nextToken = page.nextToken;
  } while (nextToken);

  return { status, statusMessage, matches };
};

export const processVideoResultController = async (input: {
  videoUploadId: string;
  pollCount: number;
}) => {
  const videoUpload = await findVideoUploadById(input.videoUploadId);
  if (!videoUpload) {
    throw new Error(`Video upload ${input.videoUploadId} not found`);
  }

  if (!videoUpload.rekognitionJobId) {
    throw new Error(`Video upload ${input.videoUploadId} does not have a Rekognition job id`);
  }

  const result = await loadAllFaceSearchResults(videoUpload.rekognitionJobId);

  if (result.status === 'IN_PROGRESS') {
    if (input.pollCount >= config.video.rekognitionMaxPolls) {
      await markVideoUploadFailed(videoUpload.id, 'Video analysis timed out while waiting for Rekognition results');
      return;
    }

    await getQueueService().enqueue(
      {
        type: 'PROCESS_VIDEO_RESULT',
        payload: {
          videoUploadId: videoUpload.id,
          pollCount: input.pollCount + 1
        }
      },
      {
        delaySeconds: config.video.rekognitionPollDelaySeconds
      }
    );
    return;
  }

  if (result.status !== 'SUCCEEDED') {
    await markVideoUploadFailed(videoUpload.id, result.statusMessage || `Video analysis failed with status ${result.status || 'UNKNOWN'}`);
    return;
  }

  const dedupedMatches = await dedupeMatchesByUser(videoUpload.eventId, videoUpload.id, result.matches);
  const thumbnailKeysByUser = await extractThumbnails(videoUpload, dedupedMatches);

  await replaceVideoFaceMatches(
    videoUpload.id,
    dedupedMatches.map((match) => ({
      ...match,
      boundingBox: match.boundingBox,
      thumbnailS3Key: thumbnailKeysByUser.get(match.userId)
    }))
  );

  const firstThumbnail = dedupedMatches
    .map((match) => thumbnailKeysByUser.get(match.userId))
    .find((value): value is string => Boolean(value));

  await markVideoUploadProcessed(videoUpload.id, {
    thumbnailS3Key: firstThumbnail
  });
};
