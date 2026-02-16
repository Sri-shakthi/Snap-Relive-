import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const presignPhotoSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  contentType: Joi.string().trim().required()
});

const confirmPhotoSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  bucket: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required()
});

export interface ValidatePhotoPresignInput {
  eventId: string;
  contentType: string;
}

export interface ValidatePhotoConfirmInput {
  eventId: string;
  bucket: string;
  s3Key: string;
}

export const validatePhotoPresign = (payload: unknown): { value: ValidatePhotoPresignInput } => {
  const result = presignPhotoSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid photo presign payload', result.error.details);
  } else {
    return { value: result.value as ValidatePhotoPresignInput };
  }
};

export const validatePhotoConfirm = (payload: unknown): { value: ValidatePhotoConfirmInput } => {
  const result = confirmPhotoSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid photo confirm payload', result.error.details);
  } else {
    return { value: result.value as ValidatePhotoConfirmInput };
  }
};
