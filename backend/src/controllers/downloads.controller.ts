import pkg from '@prisma/client';
import {
  createDownloadJob,
  findDownloadJobById,
  getDownloadablePhotos
} from '../data-access/downloads.dao.js';
import { createAssetUrl } from '../services/awsS3.js';
import { getQueueService } from '../services/queue.js';
import { AppError } from '../utils/errors.js';

const { DownloadJobStatus } = pkg;

export interface CreateDownloadControllerInput {
  userId: string;
  eventId: string;
  photoIds: string[];
}

export interface GetDownloadControllerInput {
  downloadId: string;
  userId: string;
}

export interface CreateDownloadLinksControllerInput {
  userId: string;
  eventId: string;
  photoIds: string[];
}

export const createDownloadController = async (input: CreateDownloadControllerInput) => {
  const downloadJob = await createDownloadJob({
    userId: input.userId,
    eventId: input.eventId,
    photoIds: input.photoIds
  });

  await getQueueService().enqueue({
    type: 'PROCESS_DOWNLOAD',
    payload: {
      downloadJobId: downloadJob.id,
      userId: input.userId,
      eventId: input.eventId
    }
  });

  return {
    downloadId: downloadJob.id,
    status: downloadJob.status
  };
};

export const getDownloadController = async (input: GetDownloadControllerInput) => {
  const downloadJob = await findDownloadJobById(input.downloadId);
  if (!downloadJob || downloadJob.userId !== input.userId) {
    throw new AppError(404, 'NOT_FOUND', 'Download job not found');
  }

  if (downloadJob.status === DownloadJobStatus.COMPLETED && downloadJob.s3Key) {
    const signed = await createAssetUrl({ s3Key: downloadJob.s3Key });
    return {
      downloadId: downloadJob.id,
      status: downloadJob.status,
      downloadUrl: signed.downloadUrl,
      expiresInSeconds: signed.expiresInSeconds
    };
  }

  return {
    downloadId: downloadJob.id,
    status: downloadJob.status,
    errorMessage: downloadJob.errorMessage ?? null
  };
};

export const createDownloadLinksController = async (input: CreateDownloadLinksControllerInput) => {
  const photos = await getDownloadablePhotos({
    eventId: input.eventId,
    photoIds: input.photoIds
  });

  const links = await Promise.all(
    photos.map(async (photo) => {
      const full = await createAssetUrl({ s3Key: photo.s3Key });
      const preview = photo.previewS3Key
        ? await createAssetUrl({ s3Key: photo.previewS3Key })
        : full;

      return {
        photoId: photo.id,
        previewUrl: preview.downloadUrl,
        downloadUrl: full.downloadUrl
      };
    })
  );

  return {
    count: links.length,
    links
  };
};
