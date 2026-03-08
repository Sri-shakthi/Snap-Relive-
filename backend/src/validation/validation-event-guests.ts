import Joi from 'joi';
import { AppError } from '../utils/errors.js';

const eventIdSchema = Joi.object({
  eventId: Joi.string().trim().required()
});

const sendGuestWhatsAppSchema = Joi.object({
  eventId: Joi.string().trim().required(),
  userId: Joi.string().trim().required()
});

export interface ValidateEventIdInput {
  eventId: string;
}

export interface ValidateSendGuestWhatsAppInput {
  eventId: string;
  userId: string;
}

export const validateEventId = (payload: unknown): { value: ValidateEventIdInput } => {
  const result = eventIdSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid event guest query payload', result.error.details);
  }

  return { value: result.value as ValidateEventIdInput };
};

export const validateSendGuestWhatsApp = (payload: unknown): { value: ValidateSendGuestWhatsAppInput } => {
  const result = sendGuestWhatsAppSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (result.error) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid guest WhatsApp payload', result.error.details);
  }

  return { value: result.value as ValidateSendGuestWhatsAppInput };
};
