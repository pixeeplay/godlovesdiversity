import { NextRequest, NextResponse } from 'next/server';
import { syncAllWatchesToRag } from '@/lib/price-rag-sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET /api/cron/prices-rag-sync — synchronise tous les watches actifs dans le RAG. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || '';
  const provided = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret') || '';
  if (secret && provided !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Optionnel : ne sync que les watches modifiés dans les dernières 25h (delta)
  const onlyDelta = req.nextUrl.searchParams.get('delta') === '1';
  const since = onlyDelta ? new Date(Date.now() - 25 * 3600_000) : undefined;

  try {
    const r = await syncAllWatchesToRag({ onlyUpdatedSince: since });
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
