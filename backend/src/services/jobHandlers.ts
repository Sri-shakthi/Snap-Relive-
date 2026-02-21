import JSZip from 'jszip';
import {
  castPhotoIdsFromJson,
  findDownloadJobById,
  getDownloadablePhotos,
  markDownloadJobCompleted,
  markDownloadJobFailed,
  markDownloadJobProcessing
} from '../data-access/downloads.dao.js';
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
import { buildImageVariants } from './imageVariants.js';
import { getObjectAsBuffer, putObjectBuffer } from './awsS3.js';
import { QueueJob } from './queue.js';
import { AppError } from '../utils/errors.js';
import { scheduleEventSelfieRematch } from './rematchScheduler.js';

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

    const originalBuffer = await getObjectAsBuffer({
      bucket: photo.s3Bucket,
      s3Key: photo.s3Key
    });

    const variants = await buildImageVariants(originalBuffer);
    const thumbnailS3Key = `${photo.s3Key}.thumb.jpg`;
    const previewS3Key = `${photo.s3Key}.preview.jpg`;

    await putObjectBuffer({
      bucket: photo.s3Bucket,
      s3Key: thumbnailS3Key,
      body: variants.thumbnail,
      contentType: 'image/jpeg'
    });

    await putObjectBuffer({
      bucket: photo.s3Bucket,
      s3Key: previewS3Key,
      body: variants.preview,
      contentType: 'image/jpeg'
    });

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

    await markPhotoProcessed(photo.id, {
      thumbnailS3Key,
      previewS3Key
    });

    if (faces.length > 0) {
      scheduleEventSelfieRematch(photo.eventId);
    }
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

    const matchedFaceIds = matches.flatMap((match) => (match.faceId ? [match.faceId] : []));
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

export const handleProcessDownloadJob = async (job: QueueJob): Promise<void> => {
  if (!job.payload.downloadJobId) {
    throw new AppError(400, 'VALIDATION_ERROR', 'downloadJobId is required for PROCESS_DOWNLOAD');
  }

  const downloadJob = await findDownloadJobById(job.payload.downloadJobId);
  if (!downloadJob) {
    throw new AppError(404, 'NOT_FOUND', `Download job ${job.payload.downloadJobId} not found`);
  }

  await markDownloadJobProcessing(downloadJob.id);

  try {
    const photoIds = castPhotoIdsFromJson(downloadJob.selectedPhotoIds);
    const photos = await getDownloadablePhotos({
      eventId: downloadJob.eventId,
      photoIds
    });

    const zip = new JSZip();

    for (const photo of photos) {
      const imageBuffer = await getObjectAsBuffer({
        bucket: photo.s3Bucket,
        s3Key: photo.s3Key
      });

      const filename = `photo-${photo.id}.jpg`;
      zip.file(filename, imageBuffer);
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const s3Key = `events/${downloadJob.eventId}/downloads/${downloadJob.userId}/${downloadJob.id}.zip`;

    const uploaded = await putObjectBuffer({
      s3Key,
      body: zipBuffer,
      contentType: 'application/zip'
    });

    await markDownloadJobCompleted(downloadJob.id, {
      s3Bucket: uploaded.bucket,
      s3Key: uploaded.s3Key
    });
  } catch (error) {
    await markDownloadJobFailed(downloadJob.id, stringifyError(error));
    throw error;
  }
};
