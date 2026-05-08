import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { computeBrainSnapshot, type BrainSnapshot } from '@/lib/brain-stats';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/admin/knowledge/brain
 * Renvoie un snapshot complet de l'état du cerveau RAG.
 * Cache mémoire 30s pour éviter de spammer la DB pendant que l'admin regarde la viz.
 */

let cache: { ts: number; snap: BrainSnapshot } | null = null;
const CACHE_MS = 30_000;

export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!force && cache && Date.now() - cache.ts < CACHE_MS) {
    return NextResponse.json({ ...cache.snap, _cached: true });
  }

  try {
    const snap = await computeBrainSnapshot();
    cache = { ts: Date.now(), snap };
    return NextResponse.json(snap);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'snapshot KO' }, { status: 500 });
  }
}
