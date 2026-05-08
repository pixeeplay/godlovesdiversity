/**
 * tariff-ingestor — orchestre l'ingestion d'un fichier tarif fournisseur dans le système prix.
 *
 * Pipeline :
 *   1. Parse le fichier (tariff-parser)
 *   2. Pour chaque ligne :
 *      a. Trouve un PriceWatch correspondant (SKU > EAN > nom+brand)
 *      b. Si pas de match : crée un PriceWatch avec les infos
 *      c. Trouve/crée le CompetitorProduct pour ce vendeur (vendorDomain de la source)
 *      d. Crée un PriceSnapshot avec extractionMethod = 'tariff'
 *   3. Update le TariffImport avec les compteurs finaux
 *
 * Note : les tarifs fournisseurs reçus en B2B sont souvent HT, l'admin doit configurer
 * un transform `*1.20` dans le mapping si nécessaire pour avoir du TTC.
 */

import { prisma } from './prisma';
import { parseTariff, sha256, type Mapping } from './tariff-parser';

export type IngestResult = {
  importId: string;
  rowsParsed: number;
  snapshotsCreated: number;
  watchesCreated: number;
  competitorsAffected: number;
  rowsSkipped: number;
  errors: { row: number; message: string }[];
};

/**
 * Ingère un fichier de tarifs depuis une source. Crée un TariffImport, parse, applique.
 */
export async function ingestTariffFile(opts: {
  sourceId: string;
  fileName: string;
  fileContent: string;
  trigger: 'manual' | 'webhook' | 'cron' | 'api';
}): Promise<IngestResult> {
  const source = await prisma.tariffSource.findUnique({ where: { id: opts.sourceId } });
  if (!source) throw new Error(`TariffSource ${opts.sourceId} introuvable`);

  // 1. Crée le TariffImport (status running)
  const fileHash = await sha256(opts.fileContent);
  const tImport = await prisma.tariffImport.create({
    data: {
      sourceId: source.id,
      status: 'running',
      trigger: opts.trigger,
      fileName: opts.fileName,
      fileBytes: opts.fileContent.length,
      fileSha256: fileHash,
    },
  });

  const errorList: { row: number; message: string }[] = [];

  try {
    // 2. Parse
    const parsed = parseTariff(opts.fileContent, {
      format: source.format === 'auto' ? undefined : (source.format as any),
      fileName: opts.fileName,
      csvDelimiter: source.csvDelimiter,
      mapping: source.mapping as Mapping,
    });

    errorList.push(...parsed.errors);
    let snapshotsCreated = 0;
    let watchesCreated = 0;
    const competitorsTouched = new Set<string>();
    let rowsSkipped = parsed.errors.length;

    const vendorDomain = source.vendorDomain || 'tariff:' + source.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 3. Pour chaque ligne parsée
    for (const row of parsed.rows) {
      try {
        // 3a. Cherche le watch correspondant
        let watch = null;
        if (row.sku) {
          watch = await prisma.priceWatch.findFirst({ where: { sku: row.sku } });
        }
        if (!watch && row.ean) {
          watch = await prisma.priceWatch.findFirst({ where: { ean: row.ean } });
        }
        if (!watch && row.name && row.brand) {
          watch = await prisma.priceWatch.findFirst({
            where: {
              name: { equals: row.name, mode: 'insensitive' },
              brand: { equals: row.brand, mode: 'insensitive' },
            },
          });
        }

        // 3b. Pas de match → crée
        if (!watch) {
          watch = await prisma.priceWatch.create({
            data: {
              name: row.name || row.sku || row.ean || 'Inconnu',
              brand: row.brand || null,
              ean: row.ean || null,
              sku: row.sku || null,
              imageUrl: row.imageUrl || null,
              currency: row.currency || 'EUR',
              tags: ['ingested-from-tariff'],
            },
          });
          watchesCreated++;
        }

        // 3c. Trouve/crée le CompetitorProduct pour ce vendeur (1 par watch+domain)
        const url = row.url || `tariff://${source.id}/${row.sku || row.ean || watch.id}`;
        let competitor = await prisma.competitorProduct.findFirst({
          where: { watchId: watch.id, domain: vendorDomain },
        });
        if (!competitor) {
          competitor = await prisma.competitorProduct.create({
            data: {
              watchId: watch.id,
              domain: vendorDomain,
              url,
              title: row.name || null,
              vendorSku: row.sku || null,
              lastFetchedAt: new Date(),
              lastStatus: 'ok',
              lastPriceCents: row.priceCents,
              lastInStock: row.inStock ?? null,
              notes: `Auto-créé depuis tarif "${source.name}"`,
            },
          });
        } else {
          await prisma.competitorProduct.update({
            where: { id: competitor.id },
            data: {
              lastFetchedAt: new Date(),
              lastStatus: 'ok',
              lastPriceCents: row.priceCents,
              lastInStock: row.inStock ?? null,
              ...(row.url && row.url !== competitor.url ? { url: row.url } : {}),
            },
          });
        }
        competitorsTouched.add(competitor.id);

        // 3d. Crée le snapshot
        await prisma.priceSnapshot.create({
          data: {
            competitorId: competitor.id,
            priceCents: row.priceCents ?? null,
            currency: row.currency || watch.currency,
            inStock: row.inStock ?? null,
            extractionMethod: 'tariff',
          },
        });
        snapshotsCreated++;
      } catch (e: any) {
        errorList.push({ row: 0, message: `${row.sku || row.ean || row.name}: ${e?.message || 'crash'}` });
        rowsSkipped++;
      }
    }

    // 4. Update du TariffImport (success)
    const final = await prisma.tariffImport.update({
      where: { id: tImport.id },
      data: {
        status: 'done',
        rowsParsed: parsed.rows.length,
        snapshotsCreated,
        watchesCreated,
        competitorsAffected: competitorsTouched.size,
        rowsSkipped,
        errors: errorList.slice(0, 50) as any,
        finishedAt: new Date(),
      },
    });

    // 5. Update les stats sur la source
    await prisma.tariffSource.update({
      where: { id: source.id },
      data: {
        lastImportAt: new Date(),
        lastImportRows: parsed.rows.length,
        lastImportErrors: errorList.length,
      },
    });

    return {
      importId: final.id,
      rowsParsed: parsed.rows.length,
      snapshotsCreated,
      watchesCreated,
      competitorsAffected: competitorsTouched.size,
      rowsSkipped,
      errors: errorList.slice(0, 50),
    };
  } catch (e: any) {
    // Erreur globale → marquer l'import en error
    await prisma.tariffImport.update({
      where: { id: tImport.id },
      data: {
        status: 'error',
        errors: [{ row: 0, message: e?.message || 'crash global' }] as any,
        finishedAt: new Date(),
      },
    });
    throw e;
  }
}

/**
 * Pull HTTP : télécharge un fichier depuis une URL et l'ingère.
 * Pour les sources type "http" (CSV/JSON public ou avec basic auth).
 */
export async function pullHttpSource(sourceId: string): Promise<IngestResult> {
  const source = await prisma.tariffSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error('source introuvable');
  if (source.type !== 'http') throw new Error('source n\'est pas de type http');
  const config = source.config as { url: string; headers?: Record<string, string>; basicAuth?: { user: string; password: string } };

  const headers: Record<string, string> = { ...(config.headers || {}) };
  if (config.basicAuth) {
    const token = btoa(`${config.basicAuth.user}:${config.basicAuth.password}`);
    headers['Authorization'] = `Basic ${token}`;
  }

  const r = await fetch(config.url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${config.url}`);
  const content = await r.text();
  const fileName = config.url.split('/').pop() || 'tariff.csv';

  return ingestTariffFile({
    sourceId,
    fileName,
    fileContent: content,
    trigger: 'cron',
  });
}
