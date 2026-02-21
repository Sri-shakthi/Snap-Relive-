import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const createDownloadSchema = Joi.object({
  userId: Joi.string().trim().required(),
  eventId: Joi.string().trim().required(),
  photoIds: Joi.array().items(Joi.string().trim().required()).min(1).max(200).required()
});

const createDownloadLinksSchema = Joi.object({
  userId: Joi.string().trim().required(),
  eventId: Joi.string().trim().required(),
  photoIds: Joi.array().items(Joi.string().trim().required()).min(1).max(200).required()
});

const getDownloadSchema = Joi.object({
  downloadId: Joi.string().trim().required(),
  userId: Joi.string().trim().required()
});

export interface ValidateCreateDownloadInput {
  userId: string;
  eventId: string;
  photoIds: string[];
}

export interface ValidateGetDownloadInput {
  downloadId: string;
  userId: string;
}

export interface ValidateCreateDownloadLinksInput {
  userId: string;
  eventId: string;
  photoIds: string[];
}

export const validateCreateDownload = (payload: unknown): { value: ValidateCreateDownloadInput } => {
  const result = createDownloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid download create payload', result.error.details);
  }

  return { value: result.value as ValidateCreateDownloadInput };
};

export const validateGetDownload = (payload: unknown): { value: ValidateGetDownloadInput } => {
  const result = getDownloadSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid download query payload', result.error.details);
  }

  return { value: result.value as ValidateGetDownloadInput };
};

export const validateCreateDownloadLinks = (
  payload: unknown
): { value: ValidateCreateDownloadLinksInput } => {
  const result = createDownloadLinksSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid download links payload', result.error.details);
  }

  return { value: result.value as ValidateCreateDownloadLinksInput };
};
