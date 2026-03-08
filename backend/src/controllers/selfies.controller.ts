import { v4 as uuidv4 } from 'uuid';
import { findEventGuestByUserAndEvent } from '../data-access/eventGuests.dao.js';
import { findEventById } from '../data-access/events.dao.js';
import { upsertUserSelfiePending } from '../data-access/selfies.dao.js';
import { ensureUserExists } from '../data-access/users.dao.js';
import { createPresignedPutUrl } from '../services/awsS3.js';
import { getQueueService } from '../services/queue.js';
import { AppError } from '../utils/errors.js';

export interface SelfiePresignControllerInput {
  userId: string;
  eventId: string;
  contentType: string;
}

export interface SelfieConfirmControllerInput {
  userId: string;
  eventId: string;
  bucket: string;
  s3Key: string;
}

export const presignSelfieController = async (input: SelfiePresignControllerInput) => {
  const event = await findEventById(input.eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const s3Key = `events/${input.eventId}/users/${input.userId}/selfies/${Date.now()}-${uuidv4()}`;
  const signed = await createPresignedPutUrl({ s3Key, contentType: input.contentType });

  return signed;
};

export const confirmSelfieController = async (input: SelfieConfirmControllerInput) => {
  const user = await ensureUserExists(input.userId);
  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'Guest registration not found');
  }

  const event = await findEventById(input.eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const eventGuest = await findEventGuestByUserAndEvent(input.userId, input.eventId);
  if (!eventGuest) {
    throw new AppError(404, 'NOT_FOUND', 'Guest registration not found for this event');
  }

  const selfie = await upsertUserSelfiePending({
    userId: input.userId,
    eventId: input.eventId,
    s3Bucket: input.bucket,
    s3Key: input.s3Key
  });

  await getQueueService().enqueue({
    type: 'PROCESS_SELFIE',
    payload: {
      selfieId: selfie.id,
      userId: selfie.userId,
      eventId: selfie.eventId,
      bucket: selfie.s3Bucket,
      s3Key: selfie.s3Key
    }
  });

  return {
    selfieId: selfie.id,
    status: selfie.status
  };
};
