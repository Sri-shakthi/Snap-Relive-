import { createEvent, findEventById } from '../data-access/events.dao.js';
import { listVideoUploadsForEvent } from '../data-access/videos.dao.js';
import { ensureCollection } from '../services/awsRekognition.js';
import { AppError } from '../utils/errors.js';

export interface CreateEventControllerInput {
  name: string;
  eventType: 'MARRIAGE' | 'BIRTHDAY' | 'CORPORATE' | 'OTHER';
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
      eventType: input.eventType,
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

export const getEventController = async (eventId: string) => {
  const event = await findEventById(eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  return {
    event
  };
};

export const listEventVideoStatusesController = async (eventId: string) => {
  const event = await findEventById(eventId);
  if (!event) {
    throw new AppError(404, 'NOT_FOUND', 'Event not found');
  }

  const videos = await listVideoUploadsForEvent(eventId);

  return {
    videos: videos.map((video) => ({
      id: video.id,
      originalFileName: video.originalFileName,
      status: video.status,
      displayStatus:
        video.status === 'FAILED'
          ? 'FAILED'
          : video.status === 'PROCESSING'
            ? 'ANALYZING'
            : video.status === 'PROCESSED'
              ? video._count.matches > 0
                ? 'MATCHED'
                : 'NO_MATCH'
              : 'UPLOADED',
      matchCount: video._count.matches,
      matchedUsers: video.matches.map((match) => ({
        userId: match.userId,
        fullName: match.user.eventGuests[0]?.fullName || match.userId,
        phone: match.user.eventGuests[0]?.phone,
        similarity: match.similarity,
        timestampMs: match.timestampMs
      })),
      durationSeconds: video.durationSeconds,
      errorMessage: video.errorMessage,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt
    }))
  };
};
