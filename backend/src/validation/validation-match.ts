import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const getMatchesSchema = Joi.object({
  userId: Joi.string().trim().required(),
  eventId: Joi.string().trim().required(),
  cursor: Joi.string().trim().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

export interface ValidateGetMatchesInput {
  userId: string;
  eventId: string;
  cursor?: string;
  limit: number;
}

export const validateGetMatches = (payload: unknown): { value: ValidateGetMatchesInput } => {
  const result = getMatchesSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid match query payload', result.error.details);
  } else {
    return { value: result.value as ValidateGetMatchesInput };
  }
};
