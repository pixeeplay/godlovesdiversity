/**
 * price-tracker — orchestrateur du comparateur de prix.
 *
 * Pour un PriceWatch donné :
 *   1. Récupère tous ses CompetitorProduct actifs
 *   2. Scrape chaque URL via price-extractor
 *   3. Insère un PriceSnapshot pour chaque
 *   4. Met à jour le cache lastPrice/lastFetchedAt sur le CompetitorProduct
 *   5. Calcule le nextRefreshAt du watch
 *
 * Utilisé par :
 *   - L'API admin (refresh manuel d'un watch)
 *   - Le cron (refresh batch des watches dont nextRefreshAt < now)
 */

import { prisma } from './prisma';
import { extractPriceFromUrl, type ExtractedPrice } from './price-extractor';

export type RefreshResult = {
  watchId: string;
  watchName: string;
  total: number;
  success: number;
  failed: number;
  details: {
    competitorId: string;
    domain: string;
    url: string;
    ok: boolean;
    priceCents?: number;
    delta?: number;        // Variation vs dernier snapshot (centimes)
    deltaPct?: number;     // Variation %
    inStock?: boolean | null;       // Disponibilité courante (pour alerte restock)
    prevInStock?: boolean | null;   // Disponibilité au refresh précédent
    error?: string;
  }[];
};

/**
 * Refresh les prix d'un watch : scrape toutes ses sources, insère snapshots, update caches.
 */
export async function refreshWatch(watchId: string): Promise<RefreshResult> {
  const watch = await prisma.priceWatch.findUnique({
    where: { id: watchId },
    include: {
      competitors: {
        where: { active: true },
      },
    },
  });
  if (!watch) throw new Error(`Watch ${watchId} introuvable`);

  const result: RefreshResult = {
    watchId: watch.id,
    watchName: watch.name,
    total: watch.competitors.length,
    success: 0,
    failed: 0,
    details: [],
  };

  for (const c of watch.competitors) {
    const extracted = await extractPriceFromUrl(c.url);
    const ok = extracted.method !== 'failed' && extracted.priceCents !== undefined;

    // Calcul du delta vs dernier snapshot
    let delta: number | undefined;
    let deltaPct: number | undefined;
    if (ok && c.lastPriceCents && extracted.priceCents) {
      delta = extracted.priceCents - c.lastPriceCents;
      deltaPct = Math.round((delta / c.lastPriceCents) * 1000) / 10;
    }

    // Insère le snapshot
    await prisma.priceSnapshot.create({
      data: {
        competitorId: c.id,
        priceCents: extracted.priceCents ?? null,
        currency: extracted.currency || c.lastPriceCents ? watch.currency : 'EUR',
        inStock: extracted.inStock ?? null,
        oldPriceCents: extracted.oldPriceCents ?? null,
        extractionMethod: extracted.method,
        httpStatus: extracted.httpStatus,
        error: extracted.error || null,
      },
    });

    // Update cache + métadonnées du CompetitorProduct
    await prisma.competitorProduct.update({
      where: { id: c.id },
      data: {
        lastFetchedAt: new Date(),
        lastStatus: ok ? 'ok' : (extracted.error ? 'error' : 'no-price'),
        ...(ok ? { lastPriceCents: extracted.priceCents, lastInStock: extracted.inStock } : {}),
        // Si on a un meilleur titre / image, on met à jour
        ...(extracted.title && !c.title ? { title: extracted.title } : {}),
      },
    });

    if (ok) result.success++;
    else result.failed++;

    result.details.push({
      competitorId: c.id,
      domain: c.domain,
      url: c.url,
      ok,
      priceCents: extracted.priceCents,
      delta,
      deltaPct,
      // Pour l'alerte "retour en stock" (transition prevInStock=false → inStock=true)
      inStock: extracted.inStock ?? null,
      prevInStock: c.lastInStock ?? null,
      error: extracted.error,
    });
  }

  // Reschedule le prochain refresh
  const nextRefresh = new Date(Date.now() + watch.refreshIntervalHours * 3600_000);
  await prisma.priceWatch.update({
    where: { id: watchId },
    data: { nextRefreshAt: nextRefresh, updatedAt: new Date() },
  });

  // Sync auto dans le RAG (Phase 4) — fail silently pour ne pas casser le refresh
  try {
    const { syncWatchToRag } = await import('./price-rag-sync');
    await syncWatchToRag(watchId);
  } catch { /* RAG sync best-effort */ }

  // Trigger alertes prix (Phase 5) — fail silently aussi
  try {
    const { checkPriceAlerts } = await import('./price-alerts');
    await checkPriceAlerts(watchId, result);
  } catch { /* alerts best-effort */ }

  return result;
}

/**
 * Refresh batch tous les watches actifs dont le nextRefreshAt est dépassé.
 * Utilisé par le cron /api/cron/prices-refresh.
 */
export async function refreshDueWatches(opts: { maxWatches?: number } = {}): Promise<RefreshResult[]> {
  const max = opts.maxWatches ?? 20;
  const due = await prisma.priceWatch.findMany({
    where: {
      active: true,
      OR: [
        { nextRefreshAt: null },
        { nextRefreshAt: { lte: new Date() } },
      ],
    },
    take: max,
    orderBy: { nextRefreshAt: 'asc' },
  });

  const results: RefreshResult[] = [];
  for (const w of due) {
    try {
      results.push(await refreshWatch(w.id));
    } catch (e: any) {
      results.push({
        watchId: w.id,
        watchName: w.name,
        total: 0,
        success: 0,
        failed: 1,
        details: [{
          competitorId: '',
          domain: '',
          url: '',
          ok: false,
          error: e?.message || 'unknown',
        }],
      });
    }
  }
  return results;
}

/**
 * Crée un nouveau PriceWatch en partant d'une URL : scrape la page pour récupérer
 * nom/marque/EAN/image puis crée watch + 1er CompetitorProduct + 1er snapshot.
 */
export async function createWatchFromUrl(url: string, opts: {
  category?: string;
  tags?: string[];
  targetPriceCents?: number;
  refreshIntervalHours?: number;
} = {}) {
  const extracted = await extractPriceFromUrl(url);
  if (extracted.method === 'failed' || !extracted.priceCents) {
    throw new Error(`Impossible d'extraire un prix depuis ${url} : ${extracted.error || 'aucune méthode n\'a marché'}`);
  }

  const watch = await prisma.priceWatch.create({
    data: {
      name: extracted.title || url,
      brand: extracted.brand || null,
      ean: extracted.ean || null,
      sku: extracted.sku || null,
      category: opts.category,
      imageUrl: extracted.imageUrl || null,
      tags: opts.tags || [],
      currency: extracted.currency || 'EUR',
      targetPriceCents: opts.targetPriceCents || null,
      refreshIntervalHours: opts.refreshIntervalHours || 24,
      nextRefreshAt: new Date(Date.now() + (opts.refreshIntervalHours || 24) * 3600_000),
    },
  });

  const competitor = await prisma.competitorProduct.create({
    data: {
      watchId: watch.id,
      domain: extracted.domain,
      url: extracted.url,
      title: extracted.title || null,
      vendorSku: extracted.sku || null,
      lastFetchedAt: new Date(),
      lastStatus: 'ok',
      lastPriceCents: extracted.priceCents,
      lastInStock: extracted.inStock ?? null,
    },
  });

  await prisma.priceSnapshot.create({
    data: {
      competitorId: competitor.id,
      priceCents: extracted.priceCents,
      currency: extracted.currency || 'EUR',
      inStock: extracted.inStock ?? null,
      oldPriceCents: extracted.oldPriceCents ?? null,
      extractionMethod: extracted.method,
      httpStatus: extracted.httpStatus,
    },
  });

  return { watch, competitor, extracted };
}

/**
 * Ajoute une URL concurrent à un watch existant + scrape immédiatement.
 */
export async function addCompetitorToWatch(watchId: string, url: string) {
  const watch = await prisma.priceWatch.findUnique({ where: { id: watchId } });
  if (!watch) throw new Error('Watch introuvable');

  const extracted = await extractPriceFromUrl(url);

  const competitor = await prisma.competitorProduct.create({
    data: {
      watchId,
      domain: extracted.domain,
      url: extracted.url,
      title: extracted.title || null,
      vendorSku: extracted.sku || null,
      lastFetchedAt: new Date(),
      lastStatus: extracted.priceCents !== undefined ? 'ok' : 'no-price',
      lastPriceCents: extracted.priceCents ?? null,
      lastInStock: extracted.inStock ?? null,
    },
  });

  await prisma.priceSnapshot.create({
    data: {
      competitorId: competitor.id,
      priceCents: extracted.priceCents ?? null,
      currency: extracted.currency || watch.currency,
      inStock: extracted.inStock ?? null,
      oldPriceCents: extracted.oldPriceCents ?? null,
      extractionMethod: extracted.method,
      httpStatus: extracted.httpStatus,
      error: extracted.error || null,
    },
  });

  return { competitor, extracted };
}
