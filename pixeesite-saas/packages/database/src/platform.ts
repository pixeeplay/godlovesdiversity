/**
 * Platform Prisma client (singleton).
 * Ouvre une connexion vers la DB platform partagée (Org/User/Site/...).
 */
import { PrismaClient as PlatformClient } from '../node_modules/.prisma/platform-client';

declare global {
  // eslint-disable-next-line no-var
  var __pixeesite_platform_db: PlatformClient | undefined;
}

export const platformDb: PlatformClient =
  globalThis.__pixeesite_platform_db ??
  new PlatformClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__pixeesite_platform_db = platformDb;
}

export type { PlatformClient };
