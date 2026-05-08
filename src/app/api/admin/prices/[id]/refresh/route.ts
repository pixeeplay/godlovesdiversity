import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshWatch } from '@/lib/price-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Plusieurs concurrents = peut prendre 1 min

/**
 * POST /api/admin/prices/[id]/refresh — refresh manuel d'un watch.
 * Renvoie un RefreshResult avec les détails par concurrent.
 */
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const result = await refreshWatch(ctx.params.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'refresh KO' }, { status: 500 });
  }
}
