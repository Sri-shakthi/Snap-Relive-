import { prisma } from './prisma.js';

export interface UpsertMatchInput {
  userId: string;
  eventId: string;
  photoId: string;
  similarity: number;
}

export const upsertMatchResult = async (input: UpsertMatchInput) => {
  return prisma.matchResult.upsert({
    where: {
      userId_eventId_photoId: {
        userId: input.userId,
        eventId: input.eventId,
        photoId: input.photoId
      }
    },
    create: {
      userId: input.userId,
      eventId: input.eventId,
      photoId: input.photoId,
      similarity: input.similarity
    },
    update: {
      similarity: input.similarity
    }
  });
};

export const listMatchesForUserEvent = async (params: {
  userId: string;
  eventId: string;
  cursor?: string;
  limit: number;
}) => {
  return prisma.matchResult.findMany({
    where: {
      userId: params.userId,
      eventId: params.eventId
    },
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
    take: params.limit + 1,
    orderBy: [{ similarity: 'desc' }, { id: 'asc' }],
    include: {
      photo: true
    }
  });
};
