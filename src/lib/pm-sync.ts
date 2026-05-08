/**
 * pm-sync — synchronise le catalogue productsmanager.app vers les PriceWatch GLD.
 *
 * Pour chaque produit PM :
 *   1. Cherche un PriceWatch existant (par pmProductId, puis SKU, puis EAN)
 *   2. Si trouvé : update les méta (nom/brand/image) sans toucher aux concurrents
 *   3. Si pas trouvé : crée un nouveau PriceWatch avec pmProductId
 *
 * Optionnel (futur) : créer aussi un PriceSnapshot avec le prix PM comme « prix de référence »,
 * via un CompetitorProduct synthétique (domain = "pm:internal").
 */

import { prisma } from './prisma';
import { listPmProducts, type PmProduct } from './pm-client';

export type SyncResult = {
  pulled: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { pmId: string; message: string }[];
};

export async function syncPmCatalog(opts: { maxItems?: number; createSnapshots?: boolean } = {}): Promise<SyncResult> {
  const products = await listPmProducts({ maxItems: opts.maxItems ?? 500 });

  const result: SyncResult = {
    pulled: products.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const p of products) {
    try {
      // 1. Cherche un watch existant
      let watch = await prisma.priceWatch.findUnique({ where: { pmProductId: p.id } });
      if (!watch && p.sku) watch = await prisma.priceWatch.findFirst({ where: { sku: p.sku } });
      if (!watch && p.ean) watch = await prisma.priceWatch.findFirst({ where: { ean: p.ean } });

      if (watch) {
        // Update méta + lie à PM si pas déjà fait
        await prisma.priceWatch.update({
          where: { id: watch.id },
          data: {
            pmProductId: p.id,
            pmSyncedAt: new Date(),
            // On ne touche aux champs canoniques que s'ils sont vides côté GLD (PM peut être moins précis)
            ...(p.name && !watch.name ? { name: p.name } : {}),
            ...(p.brand && !watch.brand ? { brand: p.brand } : {}),
            ...(p.ean && !watch.ean ? { ean: p.ean } : {}),
            ...(p.sku && !watch.sku ? { sku: p.sku } : {}),
            ...(p.imageUrl && !watch.imageUrl ? { imageUrl: p.imageUrl } : {}),
            ...(p.category && !watch.category ? { category: p.category } : {}),
          },
        });
        result.updated++;
      } else {
        // Crée un nouveau watch
        const created = await prisma.priceWatch.create({
          data: {
            name: p.name || p.sku || p.ean || `PM ${p.id}`,
            brand: p.brand || null,
            ean: p.ean || null,
            sku: p.sku || null,
            category: p.category || null,
            imageUrl: p.imageUrl || null,
            currency: p.currency || 'EUR',
            tags: ['from-pm'],
            pmProductId: p.id,
            pmSyncedAt: new Date(),
          },
        });

        // Optionnel : crée un CompetitorProduct synthétique "pm:internal" avec le prix PM
        if (opts.createSnapshots && p.priceCents != null) {
          const comp = await prisma.competitorProduct.create({
            data: {
              watchId: created.id,
              domain: 'pm:internal',
              url: `pm://product/${p.id}`,
              title: p.name || null,
              vendorSku: p.sku || null,
              lastFetchedAt: new Date(),
              lastStatus: 'ok',
              lastPriceCents: p.priceCents,
              notes: 'Prix de référence PIM (productsmanager.app)',
            },
          });
          await prisma.priceSnapshot.create({
            data: {
              competitorId: comp.id,
              priceCents: p.priceCents,
              currency: p.currency || 'EUR',
              extractionMethod: 'manual',
            },
          });
        }

        result.created++;
      }
    } catch (e: any) {
      result.errors.push({ pmId: p.id, message: e?.message || 'crash' });
      result.skipped++;
    }
  }

  return result;
}
