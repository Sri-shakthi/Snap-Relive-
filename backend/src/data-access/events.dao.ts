import { prisma } from './prisma.js';

export interface CreateEventInput {
  name: string;
  eventType: 'MARRIAGE' | 'BIRTHDAY' | 'CORPORATE' | 'OTHER';
  startsAt: Date;
  endsAt: Date;
}

export const createEvent = async (input: CreateEventInput) => {
  return prisma.event.create({
    data: {
      name: input.name,
      eventType: input.eventType,
      startsAt: input.startsAt,
      endsAt: input.endsAt
    }
  });
};

export const findEventById = async (eventId: string) => {
  return prisma.event.findUnique({ where: { id: eventId } });
};
