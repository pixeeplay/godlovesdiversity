import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFreshness } from '@/lib/venue-freshness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/venues/[id]/freshness
 * Calcule et renvoie la fraîcheur d'une fiche + sauvegarde le score.
 */
export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const v = await prisma.venue.findUnique({ where: { id: ctx.params.id } });
  if (!v) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const fresh = computeFreshness(v);
  await prisma.venue.update({
    where: { id: v.id },
    data: { freshnessScore: fresh.score, freshnessCheckedAt: new Date() }
  }).catch(() => {});
  return NextResponse.json(fresh);
}
