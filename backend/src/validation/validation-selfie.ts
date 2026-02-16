import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const presignSelfieSchema = Joi.object({
  userId: Joi.string().trim().required(),
  eventId: Joi.string().trim().required(),
  contentType: Joi.string().trim().required()
});

const confirmSelfieSchema = Joi.object({
  userId: Joi.string().trim().required(),
  eventId: Joi.string().trim().required(),
  bucket: Joi.string().trim().required(),
  s3Key: Joi.string().trim().required()
});

export interface ValidateSelfiePresignInput {
  userId: string;
  eventId: string;
  contentType: string;
}

export interface ValidateSelfieConfirmInput {
  userId: string;
  eventId: string;
  bucket: string;
  s3Key: string;
}

export const validateSelfiePresign = (payload: unknown): { value: ValidateSelfiePresignInput } => {
  const result = presignSelfieSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid selfie presign payload', result.error.details);
  } else {
    return { value: result.value as ValidateSelfiePresignInput };
  }
};

export const validateSelfieConfirm = (payload: unknown): { value: ValidateSelfieConfirmInput } => {
  const result = confirmSelfieSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid selfie confirm payload', result.error.details);
  } else {
    return { value: result.value as ValidateSelfieConfirmInput };
  }
};
