import { NextRequest, NextResponse } from 'next/server';
import { refreshDueWatches } from '@/lib/price-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max pour batch

/**
 * GET /api/cron/prices-refresh
 * Endpoint déclenché par un cron externe (Coolify scheduled task ou cron classique).
 * Sécurité : header X-Cron-Secret obligatoire (ou IP whitelist côté reverse-proxy).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || '';
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const max = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('max')) || 20));

  try {
    const results = await refreshDueWatches({ maxWatches: max });
    return NextResponse.json({
      ok: true,
      processed: results.length,
      totalSuccess: results.reduce((s, r) => s + r.success, 0),
      totalFailed: results.reduce((s, r) => s + r.failed, 0),
      results: results.map((r) => ({
        watchId: r.watchId,
        watchName: r.watchName,
        total: r.total,
        success: r.success,
        failed: r.failed,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'cron KO' }, { status: 500 });
  }
}
