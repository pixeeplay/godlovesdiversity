import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/camino           — liste tous les chemins + progression
 * GET /api/camino?slug=…    — détail d'un chemin (steps + km parcourus collectivement)
 * POST /api/camino?slug=…   — ajoute une contribution {source, km?}
 */

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  try {
    if (slug) {
      const path = await (prisma as any).caminoPath.findUnique({
        where: { slug },
        include: { steps: { orderBy: { order: 'asc' } } }
      });
      if (!path) return NextResponse.json({ error: 'not-found' }, { status: 404 });
      const aggregate = await (prisma as any).caminoContribution.aggregate({
        where: { pathId: path.id },
        _sum: { km: true },
        _count: { _all: true }
      });
      const kmDone = aggregate._sum.km || 0;
      return NextResponse.json({
        path,
        progress: {
          kmDone,
          totalKm: path.totalKm,
          percent: Math.min(100, Math.round((kmDone / Math.max(1, path.totalKm)) * 100)),
          contributions: aggregate._count._all
        }
      });
    }

    const paths = await (prisma as any).caminoPath.findMany({
      where: { published: true },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { contributions: true, steps: true } } }
    });
    const enriched = await Promise.all(paths.map(async (p: any) => {
      const agg = await (prisma as any).caminoContribution.aggregate({
        where: { pathId: p.id },
        _sum: { km: true }
      });
      return { ...p, kmDone: agg._sum.km || 0 };
    }));
    return NextResponse.json({ paths: enriched });
  } catch (e: any) {
    return NextResponse.json({ paths: [], error: 'db-not-migrated' });
  }
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug-missing' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const source = ['prayer-circle', 'intention', 'candle', 'meditation', 'manual'].includes(body.source) ? body.source : 'manual';
  const km = Math.max(1, Math.min(50, parseInt(body.km) || 1));

  try {
    const path = await (prisma as any).caminoPath.findUnique({ where: { slug } });
    if (!path) return NextResponse.json({ error: 'path-not-found' }, { status: 404 });
    const c = await (prisma as any).caminoContribution.create({
      data: { pathId: path.id, source, km }
    });
    return NextResponse.json({ ok: true, contribution: c });
  } catch (e: any) {
    return NextResponse.json({ error: 'create-failed', message: e?.message }, { status: 500 });
  }
}
