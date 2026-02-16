import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const createEventSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  startsAt: Joi.date().iso().required(),
  endsAt: Joi.date().iso().greater(Joi.ref('startsAt')).required()
});

export interface ValidateCreateEventInput {
  name: string;
  startsAt: string;
  endsAt: string;
}

export const validateCreateEvent = (payload: unknown): { value: ValidateCreateEventInput } => {
  const result = createEventSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid event payload', result.error.details);
  } else {
    return { value: result.value as ValidateCreateEventInput };
  }
};
