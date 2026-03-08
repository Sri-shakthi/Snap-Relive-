import { listMatchesForUserEvent } from '../data-access/matches.dao.js';
import { findSelfieByUserEvent, markSelfiePendingForRefresh } from '../data-access/selfies.dao.js';
import { listVideoMatchesForUserEvent } from '../data-access/videos.dao.js';
import { config } from '../config/index.js';
import { createAssetUrl } from '../services/awsS3.js';
import { getQueueService } from '../services/queue.js';
import { AppError } from '../utils/errors.js';

const refreshBurstTracker = new Map<string, number>();

export interface GetMatchesControllerInput {
  userId: string;
  eventId: string;
  cursor?: string;
  limit: number;
}

export interface RefreshMatchesControllerInput {
  userId: string;
  eventId: string;
}

export const getMatchesController = async (input: GetMatchesControllerInput) => {
  const [rows, videoRows] = await Promise.all([
    listMatchesForUserEvent({
      userId: input.userId,
      eventId: input.eventId,
      cursor: input.cursor,
      limit: input.limit
    }),
    listVideoMatchesForUserEvent({
      userId: input.userId,
      eventId: input.eventId
    })
  ]);

  type ImageMatchRow = (typeof rows)[number];
  type VideoMatchRow = (typeof videoRows)[number];

  const imageMatches = await Promise.all(
    rows.map(async (item: ImageMatchRow) => {
      const full = await createAssetUrl({ s3Key: item.photo.s3Key });
      const preview = item.photo.previewS3Key
        ? await createAssetUrl({ s3Key: item.photo.previewS3Key })
        : full;
      const thumbnail = item.photo.thumbnailS3Key
        ? await createAssetUrl({ s3Key: item.photo.thumbnailS3Key })
        : preview;

      return {
        matchId: item.id,
        photoId: item.photoId,
        similarity: item.similarity,
        mediaType: 'IMAGE',
        photo: {
          bucket: item.photo.s3Bucket,
          s3Key: item.photo.s3Key,
          downloadUrl: full.downloadUrl,
          previewUrl: preview.downloadUrl,
          thumbnailUrl: thumbnail.downloadUrl,
          expiresInSeconds: full.expiresInSeconds
        },
        createdAt: item.createdAt
      };
    })
  );

  const videoMatches = await Promise.all(
    videoRows.map(async (item: VideoMatchRow) => {
      const thumbnail = item.thumbnailS3Key
        ? await createAssetUrl({ s3Key: item.thumbnailS3Key })
        : await createAssetUrl({ s3Key: item.videoUpload.thumbnailS3Key || item.videoUpload.s3Key });
      const full = await createAssetUrl({ s3Key: item.videoUpload.s3Key });

      return {
        matchId: item.id,
        photoId: item.videoUploadId,
        similarity: item.similarity,
        mediaType: 'VIDEO',
        videoTimestampMs: item.timestampMs,
        photo: {
          bucket: item.videoUpload.s3Bucket,
          s3Key: item.videoUpload.s3Key,
          downloadUrl: full.downloadUrl,
          previewUrl: full.downloadUrl,
          thumbnailUrl: thumbnail.downloadUrl,
          expiresInSeconds: full.expiresInSeconds
        },
        createdAt: item.createdAt
      };
    })
  );

  const combined = [...imageMatches, ...videoMatches].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const paged = combined.slice(0, input.limit);
  const nextCursor = combined.length > input.limit ? combined[input.limit].matchId : null;

  return {
    items: paged,
    nextCursor
  };
};

export const refreshMatchesController = async (input: RefreshMatchesControllerInput) => {
  const selfie = await findSelfieByUserEvent(input.userId, input.eventId);
  if (!selfie) {
    throw new AppError(404, 'NOT_FOUND', 'Selfie not found for this user and event');
  }

  const nowMs = Date.now();
  const lastUpdatedMs = new Date(selfie.updatedAt).getTime();
  const elapsedMs = nowMs - lastUpdatedMs;
  const cooldownMs = config.matches.refreshCooldownMs;
  const burstLimit = config.matches.refreshBurstLimit;
  const burstKey = `${input.userId}:${input.eventId}`;
  const previousAttempts = elapsedMs >= cooldownMs ? 0 : refreshBurstTracker.get(burstKey) ?? 0;

  if (elapsedMs < cooldownMs && previousAttempts >= burstLimit) {
    const retryAfterMs = cooldownMs - elapsedMs;
    throw new AppError(429, 'RATE_LIMITED', 'Refresh is on cooldown', {
      retryAfterMs,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      burstLimit
    });
  }

  const nextAttempts = previousAttempts + 1;
  refreshBurstTracker.set(burstKey, nextAttempts);

  const refreshedSelfie = await markSelfiePendingForRefresh(selfie.id);

  await getQueueService().enqueue({
    type: 'PROCESS_SELFIE',
    payload: {
      selfieId: refreshedSelfie.id,
      userId: refreshedSelfie.userId,
      eventId: refreshedSelfie.eventId,
      bucket: refreshedSelfie.s3Bucket,
      s3Key: refreshedSelfie.s3Key
    }
  });

  return {
    queued: true,
    selfieId: refreshedSelfie.id,
    status: refreshedSelfie.status,
    cooldownMs,
    burstLimit,
    attemptsRemainingBeforeCooldown: Math.max(burstLimit - nextAttempts, 0)
  };
};
