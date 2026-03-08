import { createEventGuest, findEventGuestByUserAndEvent, listEventGuestsForEvent } from '../data-access/eventGuests.dao.js';
import { findEventById } from '../data-access/events.dao.js';
import { getQueueService } from '../services/queue.js';
import { config } from '../config/index.js';
import { AppError } from '../utils/errors.js';

export interface RegisterGuestControllerInput {
  eventId: string;
  fullName: string;
  phone: string;
  side?: 'BRIDE' | 'GROOM';
  relation?: string;
}

export interface SendGuestWhatsAppLinkControllerInput {
  eventId: string;
  userId: string;
}

export const registerGuestController = async (input: RegisterGuestControllerInput) => {
  const event = await findEventById(input.eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  if (event.eventType === 'MARRIAGE') {
    if (!input.side) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Side is required for marriage events');
    }

    if (!input.relation) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Relation is required for marriage events');
    }
  }

  if (event.eventType !== 'MARRIAGE' && (input.side || input.relation)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Side and relation are only allowed for marriage events');
  }

  const { user, eventGuest } = await createEventGuest({
    eventId: input.eventId,
    fullName: input.fullName,
    phone: input.phone,
    side: input.side,
    relation: input.relation
  });

  return {
    user: {
      id: user.id
    },
    guest: eventGuest
  };
};

export const listEventGuestsController = async (eventId: string) => {
  const event = await findEventById(eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const guests = await listEventGuestsForEvent(eventId);
  return {
    guests: guests.map((guest) => ({
      userId: guest.userId,
      fullName: guest.fullName,
      phone: guest.phone,
      side: guest.side,
      relation: guest.relation,
      matchCount: guest.user.matchResults.length
    }))
  };
};

export const sendGuestWhatsAppLinkController = async (input: SendGuestWhatsAppLinkControllerInput) => {
  if (!config.whatsapp.enabled) {
    throw new AppError(503, 'INTERNAL_ERROR', 'WhatsApp delivery is not configured');
  }

  const guest = await findEventGuestByUserAndEvent(input.userId, input.eventId);
  if (!guest) {
    throw new AppError(404, 'NOT_FOUND', 'Guest not found for this event');
  }

  await getQueueService('whatsapp').enqueue({
    type: 'PROCESS_WHATSAPP',
    payload: {
      userId: input.userId,
      eventId: input.eventId
    }
  });

  return {
    queued: true,
    phoneNumber: guest.phone
  };
};
