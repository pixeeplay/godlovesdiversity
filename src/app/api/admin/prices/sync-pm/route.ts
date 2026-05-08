import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncPmCatalog } from '@/lib/pm-sync';
import { testPmConnection } from '@/lib/pm-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET /api/admin/prices/sync-pm — test de connexion PM. */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const r = await testPmConnection();
  return NextResponse.json(r);
}

/**
 * POST /api/admin/prices/sync-pm — déclenche un pull complet du catalogue PM.
 * Body : { maxItems?, createSnapshots? }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await syncPmCatalog({
      maxItems: typeof body.maxItems === 'number' ? body.maxItems : 500,
      createSnapshots: !!body.createSnapshots,
    });
    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'sync KO' }, { status: 500 });
  }
}
