import {
  clearPhotoFaces,
  createPhotoFaces,
  findPhotoById,
  findPhotoIdsByFaceIds,
  markPhotoFailed,
  markPhotoProcessed
} from '../data-access/photos.dao.js';
import { upsertMatchResult } from '../data-access/matches.dao.js';
import { findSelfieById, markSelfieFailed, markSelfieProcessed } from '../data-access/selfies.dao.js';
import { ensureCollection, indexFaces, searchFacesByImage } from './awsRekognition.js';
import { QueueJob } from './queue.js';
import { AppError } from '../utils/errors.js';

const stringifyError = (error: unknown) => (error instanceof Error ? error.message : 'Unknown error');

export const handleProcessPhotoJob = async (job: QueueJob): Promise<void> => {
  if (!job.payload.photoId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'photoId is required for PROCESS_PHOTO');
  }

  const photo = await findPhotoById(job.payload.photoId);
  if (!photo) {
    throw new AppError(404, 'NOT_FOUND', `Photo ${job.payload.photoId} not found`);
  }

  try {
    await ensureCollection(photo.eventId);
    const faces = await indexFaces({
      eventId: photo.eventId,
      bucket: photo.s3Bucket,
      s3Key: photo.s3Key
    });

    await clearPhotoFaces(photo.id);
    await createPhotoFaces(
      faces.map((face) => ({
        photoId: photo.id,
        eventId: photo.eventId,
        rekognitionFaceId: face.faceId,
        confidence: face.confidence ?? 0,
        boundingBox: face.boundingBox
      }))
    );

    await markPhotoProcessed(photo.id);
  } catch (error) {
    await markPhotoFailed(photo.id, stringifyError(error));
    throw error;
  }
};

export const handleProcessSelfieJob = async (job: QueueJob): Promise<void> => {
  if (!job.payload.selfieId || !job.payload.userId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'selfieId and userId are required for PROCESS_SELFIE');
  }

  const selfie = await findSelfieById(job.payload.selfieId);
  if (!selfie) {
    throw new AppError(404, 'NOT_FOUND', `Selfie ${job.payload.selfieId} not found`);
  }

  try {
    await ensureCollection(selfie.eventId);
    const matches = await searchFacesByImage({
      eventId: selfie.eventId,
      bucket: selfie.s3Bucket,
      s3Key: selfie.s3Key,
      maxFaces: 100
    });

    const matchedFaceIds = matches.flatMap((m) => (m.faceId ? [m.faceId] : []));
    const photoFaceMappings = await findPhotoIdsByFaceIds(selfie.eventId, matchedFaceIds);

    const similarityByPhotoId = new Map<string, number>();
    for (const mapping of photoFaceMappings) {
      const faceMatch = matches.find((match) => match.faceId === mapping.rekognitionFaceId);
      if (!faceMatch?.similarity) continue;

      const existing = similarityByPhotoId.get(mapping.photoId);
      if (!existing || faceMatch.similarity > existing) {
        similarityByPhotoId.set(mapping.photoId, faceMatch.similarity);
      }
    }

    await Promise.all(
      [...similarityByPhotoId.entries()].map(([photoId, similarity]) =>
        upsertMatchResult({
          userId: selfie.userId,
          eventId: selfie.eventId,
          photoId,
          similarity
        })
      )
    );

    await markSelfieProcessed(selfie.id, matches[0]?.faceId);
  } catch (error) {
    await markSelfieFailed(selfie.id, stringifyError(error));
    throw error;
  }
};
