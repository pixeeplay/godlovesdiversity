import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Healthcheck — pour Coolify, uptime monitors, load balancers.
 * Renvoie 200 si l'app + la DB répondent. 503 sinon.
 */
export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch { /* dbOk = false */ }

  const status = dbOk ? 200 : 503;
  return NextResponse.json({
    ok: dbOk,
    service: 'gld',
    version: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
    db: dbOk,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt
  }, { status });
}
