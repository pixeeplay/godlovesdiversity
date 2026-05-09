import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/tariffs/matrix
 * Renvoie une matrice produits × fournisseurs avec dernier prix observé.
 *
 * Query : ?limit=50 (default), ?domain=sigma-france.fr (filtre)
 */

export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(10, Number(url.searchParams.get('limit') || 50)));
  const filterDomain = url.searchParams.get('domain') || null;

  // Liste des watches actifs (limite)
  const watches = await prisma.priceWatch.findMany({
    where: { active: true },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: {
      id: true, name: true, brand: true, sku: true, ean: true,
      currency: true, targetPriceCents: true, imageUrl: true,
      competitors: {
        where: filterDomain ? { domain: filterDomain, active: true } : { active: true },
        select: {
          id: true, domain: true, url: true, lastPriceCents: true, lastInStock: true, lastFetchedAt: true,
          snapshots: {
            orderBy: { capturedAt: 'desc' },
            take: 1,
            select: { priceCents: true, capturedAt: true, extractionMethod: true }
          }
        }
      }
    }
  });

  // Liste unique de domaines
  const domains = new Set<string>();
  for (const w of watches) {
    for (const c of w.competitors) domains.add(c.domain);
  }
  const domainList = Array.from(domains).sort();

  // Construit la matrice : ligne = watch, col = domain → prix
  const rows = watches.map((w) => {
    const cells: Record<string, { priceCents: number | null; inStock: boolean | null; method?: string; capturedAt?: Date | string | null }> = {};
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    for (const c of w.competitors) {
      const lastSnap = c.snapshots[0];
      const price = c.lastPriceCents ?? lastSnap?.priceCents ?? null;
      cells[c.domain] = {
        priceCents: price,
        inStock: c.lastInStock,
        method: lastSnap?.extractionMethod || undefined,
        capturedAt: c.lastFetchedAt || lastSnap?.capturedAt || null
      };
      if (price != null) {
        if (minPrice == null || price < minPrice) minPrice = price;
        if (maxPrice == null || price > maxPrice) maxPrice = price;
      }
    }
    const spread = (minPrice != null && maxPrice != null) ? maxPrice - minPrice : null;
    return {
      id: w.id,
      name: w.name,
      brand: w.brand,
      sku: w.sku,
      ean: w.ean,
      imageUrl: w.imageUrl,
      currency: w.currency,
      targetPriceCents: w.targetPriceCents,
      cells,
      minPriceCents: minPrice,
      maxPriceCents: maxPrice,
      spreadCents: spread,
      spreadPct: (minPrice && spread) ? Math.round((spread / minPrice) * 1000) / 10 : null
    };
  });

  return NextResponse.json({
    ok: true,
    domains: domainList,
    rows,
    total: rows.length
  });
}
