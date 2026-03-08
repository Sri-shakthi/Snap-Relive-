import { prisma } from './prisma.js';

export interface CreateEventGuestInput {
  eventId: string;
  fullName: string;
  phone: string;
  side?: 'BRIDE' | 'GROOM';
  relation?: string;
}

export const createEventGuest = async (input: CreateEventGuestInput) => {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {}
    });

    const eventGuest = await tx.eventGuest.create({
      data: {
        userId: user.id,
        eventId: input.eventId,
        fullName: input.fullName,
        phone: input.phone,
        side: input.side,
        relation: input.relation
      }
    });

    return { user, eventGuest };
  });
};

export const findEventGuestByUserAndEvent = async (userId: string, eventId: string) => {
  return prisma.eventGuest.findUnique({
    where: {
      userId_eventId: {
        userId,
        eventId
      }
    }
  });
};

export const getEventGuestPhone = async (userId: string, eventId: string) => {
  const eventGuest = await findEventGuestByUserAndEvent(userId, eventId);
  return eventGuest?.phone;
};

export const listEventGuestsForEvent = async (eventId: string) => {
  return prisma.eventGuest.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          matchResults: {
            where: { eventId },
            select: { id: true }
          }
        }
      }
    }
  });
};
