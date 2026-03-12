import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __voxpredictPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__voxpredictPrisma__ ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__voxpredictPrisma__ = prisma;
}
