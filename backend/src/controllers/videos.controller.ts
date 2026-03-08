import { v4 as uuidv4 } from 'uuid';
import { findEventById } from '../data-access/events.dao.js';
import {
  createVideoUpload,
  findVideoUploadById,
  markVideoUploadFailed,
  markVideoUploadProcessing,
  updateVideoUploadSource
} from '../data-access/videos.dao.js';
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  createPresignedUploadPartUrl
} from '../services/awsS3.js';
import { startFaceSearchForVideo } from '../services/awsRekognition.js';
import { getQueueService } from '../services/queue.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';
import { normalizeVideoForRekognition } from '../services/videoTranscode.js';

export interface VideoMultipartInitInput {
  eventId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
}

export interface VideoMultipartPartUrlInput {
  eventId: string;
  s3Key: string;
  uploadId: string;
  partNumber: number;
}

export interface VideoMultipartCompleteInput extends VideoMultipartInitInput {
  s3Key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}

export interface VideoMultipartAbortInput {
  eventId: string;
  s3Key: string;
  uploadId: string;
}

const ensureEventExists = async (eventId: string) => {
  const event = await findEventById(eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }
};

export const initVideoMultipartUploadController = async (input: VideoMultipartInitInput) => {
  await ensureEventExists(input.eventId);
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const s3Key = `uploads/videos/events/${input.eventId}/${Date.now()}-${uuidv4()}-${safeName}`;
  return createMultipartUpload({
    s3Key,
    contentType: input.contentType
  });
};

export const getVideoMultipartPartUrlController = async (input: VideoMultipartPartUrlInput) => {
  await ensureEventExists(input.eventId);
  return createPresignedUploadPartUrl({
    s3Key: input.s3Key,
    uploadId: input.uploadId,
    partNumber: input.partNumber
  });
};

export const completeVideoMultipartUploadController = async (input: VideoMultipartCompleteInput) => {
  await ensureEventExists(input.eventId);

  const completed = await completeMultipartUpload({
    s3Key: input.s3Key,
    uploadId: input.uploadId,
    parts: input.parts
  });

  const videoUpload = await createVideoUpload({
    eventId: input.eventId,
    s3Bucket: completed.bucket,
    s3Key: completed.s3Key,
    originalFileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: BigInt(input.sizeBytes),
    durationSeconds: input.durationSeconds
  });

  await getQueueService().enqueue({
    type: 'PROCESS_VIDEO',
    payload: {
      videoUploadId: videoUpload.id,
      eventId: videoUpload.eventId,
      bucket: videoUpload.s3Bucket,
      s3Key: videoUpload.s3Key
    }
  });

  return {
    videoUploadId: videoUpload.id,
    status: videoUpload.status,
    bucket: videoUpload.s3Bucket,
    s3Key: videoUpload.s3Key
  };
};

export const abortVideoMultipartUploadController = async (input: VideoMultipartAbortInput) => {
  await ensureEventExists(input.eventId);
  await abortMultipartUpload({
    s3Key: input.s3Key,
    uploadId: input.uploadId
  });

  return {
    aborted: true
  };
};

export const processVideoUploadController = async (input: {
  videoUploadId: string;
  eventId: string;
  bucket: string;
  s3Key: string;
}) => {
  try {
    const videoUpload = await findVideoUploadById(input.videoUploadId);
    if (!videoUpload) {
      throw new AppError(404, 'NOT_FOUND', 'Video upload not found');
    }

    const normalized = await normalizeVideoForRekognition({
      bucket: videoUpload.s3Bucket,
      sourceS3Key: videoUpload.s3Key,
      eventId: videoUpload.eventId,
      videoUploadId: videoUpload.id
    });

    const updatedVideoUpload = await updateVideoUploadSource({
      videoUploadId: videoUpload.id,
      s3Bucket: normalized.bucket,
      s3Key: normalized.s3Key,
      contentType: normalized.contentType,
      sizeBytes: normalized.sizeBytes
    });

    const jobId = await startFaceSearchForVideo({
      eventId: updatedVideoUpload.eventId,
      bucket: updatedVideoUpload.s3Bucket,
      s3Key: updatedVideoUpload.s3Key
    });
    await markVideoUploadProcessing(input.videoUploadId, jobId);
    if (jobId) {
      await getQueueService().enqueue(
        {
          type: 'PROCESS_VIDEO_RESULT',
          payload: {
            videoUploadId: input.videoUploadId,
            pollCount: 0
          }
        },
        {
          delaySeconds: config.video.rekognitionPollDelaySeconds
        }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video processing failed';
    await markVideoUploadFailed(input.videoUploadId, message);
    throw error;
  }
};
