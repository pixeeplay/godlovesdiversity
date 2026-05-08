import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/prices/[id] — détail watch + concurrents + historique snapshots.
 * Query : ?days=30 pour limiter l'historique
 */
export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 90));
  const since = new Date(Date.now() - days * 86_400_000);

  const watch = await prisma.priceWatch.findUnique({
    where: { id: ctx.params.id },
    include: {
      competitors: {
        include: {
          snapshots: {
            where: { capturedAt: { gte: since } },
            orderBy: { capturedAt: 'asc' },
            select: {
              id: true,
              priceCents: true,
              currency: true,
              inStock: true,
              extractionMethod: true,
              httpStatus: true,
              capturedAt: true,
              error: true,
            },
          },
        },
      },
    },
  });
  if (!watch) return NextResponse.json({ error: 'watch introuvable' }, { status: 404 });

  return NextResponse.json({
    watch: {
      id: watch.id,
      name: watch.name,
      brand: watch.brand,
      ean: watch.ean,
      sku: watch.sku,
      category: watch.category,
      imageUrl: watch.imageUrl,
      tags: watch.tags,
      currency: watch.currency,
      targetPriceCents: watch.targetPriceCents,
      active: watch.active,
      refreshIntervalHours: watch.refreshIntervalHours,
      nextRefreshAt: watch.nextRefreshAt?.toISOString(),
      createdAt: watch.createdAt.toISOString(),
      updatedAt: watch.updatedAt.toISOString(),
    },
    competitors: watch.competitors.map((c) => ({
      id: c.id,
      domain: c.domain,
      url: c.url,
      title: c.title,
      vendorSku: c.vendorSku,
      notes: c.notes,
      active: c.active,
      lastFetchedAt: c.lastFetchedAt?.toISOString(),
      lastStatus: c.lastStatus,
      lastPriceCents: c.lastPriceCents,
      lastInStock: c.lastInStock,
      snapshots: c.snapshots.map((sn) => ({
        ...sn,
        capturedAt: sn.capturedAt.toISOString(),
      })),
      snapshotCount: c.snapshots.length,
    })),
    daysWindow: days,
  });
}

/**
 * PATCH /api/admin/prices/[id] — modifie active/targetPrice/intervalle/tags.
 */
export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const data: any = {};
  if (typeof body.active === 'boolean') data.active = body.active;
  if (typeof body.targetPriceCents === 'number') data.targetPriceCents = body.targetPriceCents;
  if (body.targetPriceCents === null) data.targetPriceCents = null;
  if (typeof body.refreshIntervalHours === 'number') data.refreshIntervalHours = body.refreshIntervalHours;
  if (Array.isArray(body.tags)) data.tags = body.tags;
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.category === 'string') data.category = body.category;

  try {
    const watch = await prisma.priceWatch.update({ where: { id: ctx.params.id }, data });
    return NextResponse.json({ ok: true, watch });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'update KO' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/prices/[id] — supprime watch + ses competitors + snapshots (cascade Prisma).
 */
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await prisma.priceWatch.delete({ where: { id: ctx.params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'delete KO' }, { status: 500 });
  }
}
