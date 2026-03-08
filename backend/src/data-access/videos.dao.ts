import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export interface CreateVideoUploadInput {
  eventId: string;
  s3Bucket: string;
  s3Key: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: bigint;
  durationSeconds: number;
}

export interface UpsertVideoMatchInput {
  videoUploadId: string;
  eventId: string;
  userId: string;
  timestampMs: number;
  similarity: number;
  boundingBox?: Prisma.InputJsonValue;
  thumbnailS3Key?: string;
  clipS3Key?: string;
}

export const createVideoUpload = async (input: CreateVideoUploadInput) => {
  return prisma.videoUpload.create({
    data: {
      eventId: input.eventId,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      originalFileName: input.originalFileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      durationSeconds: input.durationSeconds,
      status: 'UPLOADED'
    }
  });
};

export const findVideoUploadById = async (videoUploadId: string) => {
  return prisma.videoUpload.findUnique({ where: { id: videoUploadId } });
};

export const markVideoUploadProcessing = async (videoUploadId: string, rekognitionJobId?: string) => {
  return prisma.videoUpload.update({
    where: { id: videoUploadId },
    data: {
      status: 'PROCESSING',
      rekognitionJobId,
      errorMessage: null
    }
  });
};

export const markVideoUploadProcessed = async (
  videoUploadId: string,
  params?: { thumbnailS3Key?: string }
) => {
  return prisma.videoUpload.update({
    where: { id: videoUploadId },
    data: {
      status: 'PROCESSED',
      thumbnailS3Key: params?.thumbnailS3Key,
      errorMessage: null
    }
  });
};

export const markVideoUploadFailed = async (videoUploadId: string, errorMessage: string) => {
  return prisma.videoUpload.update({
    where: { id: videoUploadId },
    data: {
      status: 'FAILED',
      errorMessage
    }
  });
};

export const updateVideoUploadSource = async (input: {
  videoUploadId: string;
  s3Bucket: string;
  s3Key: string;
  contentType: string;
  sizeBytes?: bigint;
}) => {
  return prisma.videoUpload.update({
    where: { id: input.videoUploadId },
    data: {
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes
    }
  });
};

export const upsertVideoFaceMatch = async (input: UpsertVideoMatchInput) => {
  return prisma.videoFaceMatch.create({
    data: {
      videoUploadId: input.videoUploadId,
      eventId: input.eventId,
      userId: input.userId,
      timestampMs: input.timestampMs,
      similarity: input.similarity,
      boundingBox: input.boundingBox,
      thumbnailS3Key: input.thumbnailS3Key,
      clipS3Key: input.clipS3Key
    }
  });
};

export const replaceVideoFaceMatches = async (
  videoUploadId: string,
  matches: UpsertVideoMatchInput[]
) => {
  await prisma.videoFaceMatch.deleteMany({
    where: { videoUploadId }
  });

  if (matches.length === 0) {
    return;
  }

  await prisma.videoFaceMatch.createMany({
    data: matches.map((match) => ({
      videoUploadId: match.videoUploadId,
      eventId: match.eventId,
      userId: match.userId,
      timestampMs: match.timestampMs,
      similarity: match.similarity,
      boundingBox: match.boundingBox,
      thumbnailS3Key: match.thumbnailS3Key,
      clipS3Key: match.clipS3Key
    }))
  });
};

export const listVideoMatchesForUserEvent = async (params: { userId: string; eventId: string }) => {
  return prisma.videoFaceMatch.findMany({
    where: {
      userId: params.userId,
      eventId: params.eventId
    },
    orderBy: { createdAt: 'desc' },
    include: {
      videoUpload: true
    }
  });
};

export const listVideoUploadsForEvent = async (eventId: string) => {
  return prisma.videoUpload.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: {
      matches: {
        orderBy: [{ similarity: 'desc' }, { timestampMs: 'asc' }],
        include: {
          user: {
            select: {
              eventGuests: {
                where: { eventId },
                select: {
                  fullName: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      _count: {
        select: {
          matches: true
        }
      }
    }
  });
};
