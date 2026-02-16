import { prisma } from './prisma.js';

export interface CreateEventInput {
  name: string;
  startsAt: Date;
  endsAt: Date;
}

export const createEvent = async (input: CreateEventInput) => {
  return prisma.event.create({
    data: {
      name: input.name,
      startsAt: input.startsAt,
      endsAt: input.endsAt
    }
  });
};

export const findEventById = async (eventId: string) => {
  return prisma.event.findUnique({ where: { id: eventId } });
};
