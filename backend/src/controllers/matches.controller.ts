import { listMatchesForUserEvent } from '../data-access/matches.dao.js';
import { createPresignedGetUrl } from '../services/awsS3.js';
import { withCursorPagination } from '../utils/pagination.js';

export interface GetMatchesControllerInput {
  userId: string;
  eventId: string;
  cursor?: string;
  limit: number;
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
      const signed = await createPresignedGetUrl({ s3Key: item.photo.s3Key });
      return {
        matchId: item.id,
        photoId: item.photoId,
        similarity: item.similarity,
        photo: {
          bucket: item.photo.s3Bucket,
          s3Key: item.photo.s3Key,
          downloadUrl: signed.downloadUrl,
          expiresInSeconds: signed.expiresInSeconds
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
