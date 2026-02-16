import { prisma } from './prisma.js';

export const ensureUserExists = async (userId: string) => {
  return prisma.user.upsert({
    where: { id: userId },
    create: { id: userId },
    update: {}
  });
};
