import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const registerGuestSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  fullName: Joi.string().trim().min(2).max(120).required(),
  phone: Joi.string().trim().min(7).max(30).required(),
  side: Joi.string().valid('BRIDE', 'GROOM').optional(),
  relation: Joi.string().trim().min(2).max(120).optional()
});

export interface ValidateRegisterGuestInput {
  eventId: string;
  fullName: string;
  phone: string;
  side?: 'BRIDE' | 'GROOM';
  relation?: string;
}

export const validateRegisterGuest = (payload: unknown): { value: ValidateRegisterGuestInput } => {
  const result = registerGuestSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid guest registration payload', result.error.details);
  }

  return { value: result.value as ValidateRegisterGuestInput };
};
