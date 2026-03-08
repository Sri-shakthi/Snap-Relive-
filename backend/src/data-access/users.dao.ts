import { prisma } from './prisma.js';

export const ensureUserExists = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId }
  });
};
