import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeFreshness } from '@/lib/venue-freshness';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/admin/venues/freshness-stats?recompute=1
 * Renvoie la distribution globale de complétude des fiches venues.
 * Avec ?recompute=1, recalcule pour 500 venues les plus anciens.
 */
export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });

  const recompute = new URL(req.url).searchParams.get('recompute') === '1';

  if (recompute) {
    const venues = await prisma.venue.findMany({
      take: 500,
      orderBy: { freshnessCheckedAt: { sort: 'asc', nulls: 'first' } }
    });
    for (const v of venues) {
      const f = computeFreshness(v);
      await prisma.venue.update({
        where: { id: v.id },
        data: { freshnessScore: f.score, freshnessCheckedAt: new Date() }
      }).catch(() => {});
    }
  }

  // Stats agrégées
  const total = await prisma.venue.count();
  const buckets = [
    { label: 'Vide (0-20%)', min: 0, max: 20, count: 0 },
    { label: 'Pauvre (21-40%)', min: 21, max: 40, count: 0 },
    { label: 'Moyen (41-60%)', min: 41, max: 60, count: 0 },
    { label: 'Bon (61-80%)', min: 61, max: 80, count: 0 },
    { label: 'Excellent (81-100%)', min: 81, max: 100, count: 0 }
  ];
  for (const b of buckets) {
    b.count = await prisma.venue.count({ where: { freshnessScore: { gte: b.min, lte: b.max } } });
  }

  const avg = await prisma.venue.aggregate({ _avg: { freshnessScore: true } });
  const neverChecked = await prisma.venue.count({ where: { freshnessCheckedAt: null } });

  return NextResponse.json({
    total,
    averageScore: Math.round((avg._avg.freshnessScore || 0)),
    neverChecked,
    distribution: buckets
  });
}
