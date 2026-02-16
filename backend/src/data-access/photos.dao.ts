import { Prisma, ProcessingStatus } from '@prisma/client';
import { prisma } from './prisma.js';

export interface UpsertPhotoInput {
  eventId: string;
  s3Bucket: string;
  s3Key: string;
}

export interface CreatePhotoFaceInput {
  photoId: string;
  eventId: string;
  rekognitionFaceId?: string;
  boundingBox?: Prisma.InputJsonValue;
  confidence: number;
}

export const upsertPhotoPending = async (input: UpsertPhotoInput) => {
  return prisma.photo.upsert({
    where: {
      eventId_s3Key: {
        eventId: input.eventId,
        s3Key: input.s3Key
      }
    },
    create: {
      eventId: input.eventId,
      s3Bucket: input.s3Bucket,
      s3Key: input.s3Key,
      status: ProcessingStatus.PENDING
    },
    update: {
      s3Bucket: input.s3Bucket,
      status: ProcessingStatus.PENDING,
      errorMessage: null
    }
  });
};

export const clearPhotoFaces = async (photoId: string) => {
  await prisma.photoFace.deleteMany({ where: { photoId } });
};

export const createPhotoFaces = async (faces: CreatePhotoFaceInput[]) => {
  if (faces.length === 0) return;

  await prisma.photoFace.createMany({
    data: faces.map((face) => ({
      photoId: face.photoId,
      eventId: face.eventId,
      rekognitionFaceId: face.rekognitionFaceId,
      boundingBox: face.boundingBox,
      confidence: face.confidence
    })),
    skipDuplicates: true
  });
};

export const markPhotoProcessed = async (photoId: string) => {
  return prisma.photo.update({
    where: { id: photoId },
    data: {
      status: ProcessingStatus.PROCESSED,
      errorMessage: null
    }
  });
};

export const markPhotoFailed = async (photoId: string, errorMessage: string) => {
  return prisma.photo.update({
    where: { id: photoId },
    data: {
      status: ProcessingStatus.FAILED,
      errorMessage
    }
  });
};

export const findPhotoById = async (photoId: string) => {
  return prisma.photo.findUnique({ where: { id: photoId } });
};

export const findPhotoIdsByFaceIds = async (eventId: string, faceIds: string[]) => {
  if (faceIds.length === 0) return [];
  return prisma.photoFace.findMany({
    where: {
      eventId,
      rekognitionFaceId: { in: faceIds }
    },
    select: {
      photoId: true,
      rekognitionFaceId: true
    }
  });
};

export const getPhotosByIds = async (photoIds: string[]) => {
  if (photoIds.length === 0) return [];
  return prisma.photo.findMany({
    where: {
      id: { in: photoIds }
    }
  });
};
