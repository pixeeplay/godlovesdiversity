import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createWatchFromUrl } from '@/lib/price-tracker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/prices — liste des watches avec stats.
 */
export async function GET(_req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const watches = await prisma.priceWatch.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      competitors: {
        select: {
          id: true,
          domain: true,
          lastPriceCents: true,
          lastInStock: true,
          lastFetchedAt: true,
          lastStatus: true,
          active: true,
        },
      },
      _count: { select: { competitors: true } },
    },
  });

  const enriched = watches.map((w) => {
    const prices = w.competitors
      .filter((c) => c.lastPriceCents != null)
      .map((c) => c.lastPriceCents as number);
    return {
      id: w.id,
      name: w.name,
      brand: w.brand,
      ean: w.ean,
      sku: w.sku,
      category: w.category,
      imageUrl: w.imageUrl,
      tags: w.tags,
      currency: w.currency,
      targetPriceCents: w.targetPriceCents,
      active: w.active,
      refreshIntervalHours: w.refreshIntervalHours,
      nextRefreshAt: w.nextRefreshAt?.toISOString(),
      competitorCount: w.competitors.length,
      activeCompetitors: w.competitors.filter((c) => c.active).length,
      minPriceCents: prices.length ? Math.min(...prices) : null,
      maxPriceCents: prices.length ? Math.max(...prices) : null,
      avgPriceCents: prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null,
      domains: [...new Set(w.competitors.map((c) => c.domain))],
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ watches: enriched, total: watches.length });
}

/**
 * POST /api/admin/prices — crée un watch depuis une URL (auto-extract).
 * Body : { url, category?, tags?, targetPriceCents?, refreshIntervalHours? }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  if (!body?.url || typeof body.url !== 'string') {
    return NextResponse.json({ error: 'url manquante' }, { status: 400 });
  }

  try {
    const result = await createWatchFromUrl(body.url, {
      category: body.category,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      targetPriceCents: typeof body.targetPriceCents === 'number' ? body.targetPriceCents : undefined,
      refreshIntervalHours: typeof body.refreshIntervalHours === 'number' ? body.refreshIntervalHours : undefined,
    });
    return NextResponse.json({
      watchId: result.watch.id,
      competitorId: result.competitor.id,
      name: result.watch.name,
      priceCents: result.extracted.priceCents,
      currency: result.extracted.currency,
      method: result.extracted.method,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'création KO' }, { status: 500 });
  }
}
