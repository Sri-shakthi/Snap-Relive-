import { ProcessingStatus } from '@prisma/client';
import { prisma } from './prisma.js';

export interface UpsertSelfieInput {
  userId: string;
  eventId: string;
  s3Bucket: string;
  s3Key: string;
}

export const upsertUserSelfiePending = async (input: UpsertSelfieInput) => {
  return prisma.userSelfie.upsert({
    where: {
      userId_eventId: {
        userId: input.userId,
        eventId: input.eventId
      }
    },
    create: {
      userId: input.userId,
      eventId: input.eventId,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      status: ProcessingStatus.PENDING
    },
    update: {
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      status: ProcessingStatus.PENDING,
      errorMessage: null
    }
  });
};

export const markSelfieProcessed = async (id: string, rekognitionFaceId?: string) => {
  return prisma.userSelfie.update({
    where: { id },
    data: {
      status: ProcessingStatus.PROCESSED,
      rekognitionFaceId,
      errorMessage: null
    }
  });
};

export const markSelfieFailed = async (id: string, errorMessage: string) => {
  return prisma.userSelfie.update({
    where: { id },
    data: {
      status: ProcessingStatus.FAILED,
      errorMessage
    }
  });
};

export const findSelfieById = async (id: string) => prisma.userSelfie.findUnique({ where: { id } });

export const findSelfieByUserEvent = async (userId: string, eventId: string) => {
  return prisma.userSelfie.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId
      }
    }
  });
};

export const markSelfiePendingForRefresh = async (id: string) => {
  return prisma.userSelfie.update({
    where: { id },
    data: {
      status: ProcessingStatus.PENDING,
      errorMessage: null
    }
  });
};

export const listSelfiesForEvent = async (eventId: string) => {
  return prisma.userSelfie.findMany({
    where: {
      eventId,
      status: {
        in: [ProcessingStatus.PENDING, ProcessingStatus.PROCESSED]
      }
    },
    select: {
      id: true,
      userId: true,
      eventId: true,
      s3Bucket: true,
      s3Key: true
    }
  });
};
