import { v4 as uuidv4 } from 'uuid';
import { findEventById } from '../data-access/events.dao.js';
import { findMatchedPhotoForUserEvent } from '../data-access/matches.dao.js';
import { upsertPhotoPending } from '../data-access/photos.dao.js';
import { createPresignedPutUrl } from '../services/awsS3.js';
import { getObjectAsBuffer } from '../services/awsS3.js';
import { getQueueService } from '../services/queue.js';
import { AppError } from '../utils/errors.js';

export interface PhotoPresignControllerInput {
  eventId: string;
  contentType: string;
}

export interface PhotoConfirmControllerInput {
  eventId: string;
  bucket: string;
  s3Key: string;
}

export interface PhotoDownloadControllerInput {
  photoId: string;
  userId: string;
  eventId: string;
}

export const presignPhotoController = async (input: PhotoPresignControllerInput) => {
  const event = await findEventById(input.eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const s3Key = `uploads/images/events/${input.eventId}/${Date.now()}-${uuidv4()}`;
  const signed = await createPresignedPutUrl({
    s3Key,
    contentType: input.contentType
  });

  return signed;
};

export const confirmPhotoController = async (input: PhotoConfirmControllerInput) => {
  const event = await findEventById(input.eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const photo = await upsertPhotoPending({
    eventId: input.eventId,
    s3Bucket: input.bucket,
    s3Key: input.s3Key
  });

  await getQueueService().enqueue({
    type: 'PROCESS_PHOTO',
    payload: {
      photoId: photo.id,
      eventId: photo.eventId,
      bucket: photo.s3Bucket,
      s3Key: photo.s3Key
    }
  });

  return {
    photoId: photo.id,
    status: photo.status
  };
};

export const downloadPhotoController = async (input: PhotoDownloadControllerInput) => {
  const match = await findMatchedPhotoForUserEvent({
    userId: input.userId,
    eventId: input.eventId,
    photoId: input.photoId
  });

  if (!match) {
    throw new AppError(404, 'NOT_FOUND', 'Photo not found for this user and event');
  }

  const fileBuffer = await getObjectAsBuffer({
    bucket: match.photo.s3Bucket,
    s3Key: match.photo.s3Key
  });

  return {
    fileBuffer,
    contentType: 'image/jpeg',
    filename: `snapshots-photo-${match.photo.id}.jpg`
  };
};
