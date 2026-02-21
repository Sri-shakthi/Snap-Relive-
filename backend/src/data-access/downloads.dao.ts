import { DownloadJobStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export interface CreateDownloadJobInput {
  userId: string;
  eventId: string;
  photoIds: string[];
}

export const createDownloadJob = async (input: CreateDownloadJobInput) => {
  return prisma.downloadJob.create({
    data: {
      userId: input.userId,
      eventId: input.eventId,
      selectedPhotoIds: input.photoIds,
      status: DownloadJobStatus.PENDING
    }
  });
};

export const findDownloadJobById = async (id: string) => {
  return prisma.downloadJob.findUnique({ where: { id } });
};

export const markDownloadJobProcessing = async (id: string) => {
  return prisma.downloadJob.update({
    where: { id },
    data: {
      status: DownloadJobStatus.PROCESSING,
      errorMessage: null
    }
  });
};

export const markDownloadJobCompleted = async (id: string, params: { s3Bucket: string; s3Key: string }) => {
  return prisma.downloadJob.update({
    where: { id },
    data: {
      status: DownloadJobStatus.COMPLETED,
      s3Bucket: params.s3Bucket,
      s3Key: params.s3Key,
      errorMessage: null
    }
  });
};

export const markDownloadJobFailed = async (id: string, errorMessage: string) => {
  return prisma.downloadJob.update({
    where: { id },
    data: {
      status: DownloadJobStatus.FAILED,
      errorMessage
    }
  });
};

export const getDownloadablePhotos = async (params: { eventId: string; photoIds: string[] }) => {
  if (params.photoIds.length === 0) return [];

  return prisma.photo.findMany({
    where: {
      id: { in: params.photoIds },
      eventId: params.eventId
    },
    select: {
      id: true,
      s3Bucket: true,
      s3Key: true,
      thumbnailS3Key: true,
      previewS3Key: true,
      createdAt: true
    }
  });
};

export const castPhotoIdsFromJson = (value: Prisma.JsonValue): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => (typeof item === 'string' ? [item] : []));
};
