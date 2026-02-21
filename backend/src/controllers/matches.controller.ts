import { listMatchesForUserEvent } from '../data-access/matches.dao.js';
import { findSelfieByUserEvent, markSelfiePendingForRefresh } from '../data-access/selfies.dao.js';
import { config } from '../config/index.js';
import { createAssetUrl } from '../services/awsS3.js';
import { getQueueService } from '../services/queue.js';
import { AppError } from '../utils/errors.js';
import { withCursorPagination } from '../utils/pagination.js';

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
  const rows = await listMatchesForUserEvent({
    userId: input.userId,
    eventId: input.eventId,
    cursor: input.cursor,
    limit: input.limit
  });

  const { items, nextCursor } = withCursorPagination(rows, input.limit);

  const matches = await Promise.all(
    items.map(async (item) => {
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

  return {
    items: matches,
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

  if (elapsedMs < cooldownMs) {
    const retryAfterMs = cooldownMs - elapsedMs;
    throw new AppError(429, 'RATE_LIMITED', 'Refresh is on cooldown', {
      retryAfterMs,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000)
    });
  }

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
    cooldownMs
  };
};
