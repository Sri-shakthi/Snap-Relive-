import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const allowedVideoTypes = ['video/mp4', 'video/quicktime'];
const maxVideoSizeBytes = 2 * 1024 * 1024 * 1024;
const maxVideoDurationSeconds = 30 * 60;

const initMultipartSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  fileName: Joi.string().trim().max(255).required(),
  contentType: Joi.string().valid(...allowedVideoTypes).required(),
  sizeBytes: Joi.number().integer().min(1).max(maxVideoSizeBytes).required(),
  durationSeconds: Joi.number().integer().min(1).max(maxVideoDurationSeconds).required()
});

const multipartPartUrlSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required(),
  uploadId: Joi.string().trim().required(),
  partNumber: Joi.number().integer().min(1).max(10000).required()
});

const multipartCompleteSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required(),
  uploadId: Joi.string().trim().required(),
  fileName: Joi.string().trim().max(255).required(),
  contentType: Joi.string().valid(...allowedVideoTypes).required(),
  sizeBytes: Joi.number().integer().min(1).max(maxVideoSizeBytes).required(),
  durationSeconds: Joi.number().integer().min(1).max(maxVideoDurationSeconds).required(),
  parts: Joi.array()
    .items(
      Joi.object({
        partNumber: Joi.number().integer().min(1).required(),
        etag: Joi.string().trim().required()
      })
    )
    .min(1)
    .required()
});

const multipartAbortSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required(),
  uploadId: Joi.string().trim().required()
});

export interface ValidateVideoMultipartInitInput {
  eventId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
}

export interface ValidateVideoMultipartPartUrlInput {
  eventId: string;
  s3Key: string;
  uploadId: string;
  partNumber: number;
}

export interface ValidateVideoMultipartCompleteInput extends ValidateVideoMultipartInitInput {
  s3Key: string;
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}

export interface ValidateVideoMultipartAbortInput {
  eventId: string;
  s3Key: string;
  uploadId: string;
}

const validatePayload = <T>(schema: Joi.ObjectSchema, payload: unknown, message: string): { value: T } => {
  const result = schema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', message, result.error.details);
  }

  return { value: result.value as T };
};

export const validateVideoMultipartInit = (payload: unknown) =>
  validatePayload<ValidateVideoMultipartInitInput>(initMultipartSchema, payload, 'Invalid video multipart init payload');

export const validateVideoMultipartPartUrl = (payload: unknown) =>
  validatePayload<ValidateVideoMultipartPartUrlInput>(multipartPartUrlSchema, payload, 'Invalid video multipart part payload');

export const validateVideoMultipartComplete = (payload: unknown) =>
  validatePayload<ValidateVideoMultipartCompleteInput>(multipartCompleteSchema, payload, 'Invalid video multipart complete payload');

export const validateVideoMultipartAbort = (payload: unknown) =>
  validatePayload<ValidateVideoMultipartAbortInput>(multipartAbortSchema, payload, 'Invalid video multipart abort payload');
