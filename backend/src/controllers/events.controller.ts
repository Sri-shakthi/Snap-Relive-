import { createEvent } from '../data-access/events.dao.js';
import { ensureCollection } from '../services/awsRekognition.js';

export interface CreateEventControllerInput {
  name: string;
  startsAt: string;
  endsAt: string;
}

export const createEventController = async (input: CreateEventControllerInput) => {
  const event = await createEvent({
    name: input.name,
    startsAt: new Date(input.startsAt),
    endsAt: new Date(input.endsAt)
  });

  ensureCollection(event.id).catch((error) => {
    console.error('Failed to ensure Rekognition collection', {
      eventId: event.id,
      error
    });
  });

  return {
    event
  };
};
