import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../config/env.js';

const adapter = new PrismaMariaDb({
  url: env.databaseUrl
});

export const prisma = new PrismaClient({
  adapter
});
