import { createEvent } from '../data-access/events.dao.js';
import { ensureCollection } from '../services/awsRekognition.js';

export interface CreateEventControllerInput {
  name: string;
  startsAt: string;
  endsAt: string;
}

interface CreateEventDeps {
  createEventFn: typeof createEvent;
  ensureCollectionFn: typeof ensureCollection;
}

export const createEventControllerFactory = (deps: CreateEventDeps) => {
  return async (input: CreateEventControllerInput) => {
    const event = await deps.createEventFn({
      name: input.name,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt)
    });

    deps.ensureCollectionFn(event.id).catch((error) => {
      console.error('Failed to ensure Rekognition collection', {
        eventId: event.id,
        error
      });
    });

    return {
      event
    };
  };
};

export const createEventController = createEventControllerFactory({
  createEventFn: createEvent,
  ensureCollectionFn: ensureCollection
});
