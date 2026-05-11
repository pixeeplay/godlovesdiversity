import { NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public healthcheck. Returns 200 only if platform DB is reachable.
 * Includes counts for monitoring.
 */
export async function GET() {
  const start = Date.now();
  try {
    const [users, orgs, sites] = await Promise.all([
      platformDb.user.count(),
      platformDb.org.count(),
      platformDb.site.count(),
    ]);
    return NextResponse.json({
      status: 'ok',
      checks: { platform_db: 'ok' },
      stats: { users, orgs, sites },
      durationMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({
      status: 'error',
      checks: { platform_db: 'fail' },
      error: e.message,
      durationMs: Date.now() - start,
    }, { status: 503 });
  }
}
