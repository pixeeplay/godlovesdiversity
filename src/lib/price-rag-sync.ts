/**
 * price-rag-sync — synchronise les PriceWatch dans le RAG « Demandez à GLD ».
 *
 * Pour chaque PriceWatch actif, génère un document texte synthétique avec :
 *   - Nom, marque, EAN, SKU, catégorie, tags
 *   - Liste des concurrents avec dernier prix observé + URL
 *   - Tendance (min/max/moyenne)
 *   - Date du dernier refresh
 *
 * Ce document est injecté dans la table KnowledgeChunk via ingestDocument().
 * Le doc est marqué avec source = `price-watch://{watchId}` pour pouvoir le re-update.
 *
 * Résultat : le chat GLD peut répondre à
 *   « combien coûte le Sony FE 50mm en ce moment ? »
 *   « quel est l'objectif Sony le moins cher en stock ? »
 *   « qui propose le meilleur prix pour le Tamron 17-50 ? »
 *
 * Déclenché :
 *   - Après chaque refresh d'un watch (auto, juste après les snapshots)
 *   - Cron quotidien pour rafraîchir tous les watches modifiés (delta-sync)
 */

import { prisma } from './prisma';
import { ingestDocument } from './rag';

function fmtPrice(cents: number | null | undefined, currency = 'EUR'): string {
  if (cents == null) return 'prix inconnu';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${(cents / 100).toFixed(2)} ${sym}`;
}

/**
 * Génère le markdown synthétique pour 1 watch.
 * Format pensé pour être bien embeddé : chaque ligne porte du contexte sémantique complet.
 */
export function watchToMarkdown(watch: any): string {
  const lines: string[] = [];
  lines.push(`# ${watch.name}`);
  if (watch.brand) lines.push(`Marque : ${watch.brand}`);
  if (watch.category) lines.push(`Catégorie : ${watch.category}`);
  if (watch.ean) lines.push(`Code EAN : ${watch.ean}`);
  if (watch.sku) lines.push(`Référence SKU : ${watch.sku}`);
  if (watch.tags?.length) lines.push(`Tags : ${watch.tags.join(', ')}`);
  lines.push('');

  const competitors = (watch.competitors || []).filter((c: any) => c.active && c.lastPriceCents != null);
  if (competitors.length === 0) {
    lines.push('Aucun prix concurrent relevé pour ce produit pour le moment.');
    return lines.join('\n');
  }

  // Synthèse des prix
  const prices = competitors.map((c: any) => c.lastPriceCents as number);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
  const cur = watch.currency || 'EUR';

  lines.push(`## Prix observés chez ${competitors.length} marchand(s)`);
  lines.push('');
  lines.push(`Le prix le moins cher pour « ${watch.name} » est de ${fmtPrice(min, cur)}.`);
  lines.push(`Le prix le plus cher est de ${fmtPrice(max, cur)}.`);
  lines.push(`Le prix moyen est de ${fmtPrice(avg, cur)}.`);
  if (watch.targetPriceCents) {
    lines.push(`Le prix cible défini est de ${fmtPrice(watch.targetPriceCents, cur)}.`);
    if (min < watch.targetPriceCents) {
      lines.push(`✓ Au moins un marchand propose ce produit sous le prix cible.`);
    }
  }
  lines.push('');

  lines.push(`## Détail par marchand`);
  lines.push('');
  // Trie par prix croissant pour mettre le moins cher en premier
  const sorted = [...competitors].sort((a, b) => (a.lastPriceCents || 0) - (b.lastPriceCents || 0));
  for (const c of sorted) {
    const stockTxt = c.lastInStock === true ? ' (en stock)' : c.lastInStock === false ? ' (rupture)' : '';
    const isMin = c.lastPriceCents === min ? ' — meilleur prix' : '';
    const lastFetched = c.lastFetchedAt ? new Date(c.lastFetchedAt).toLocaleDateString('fr-FR') : 'date inconnue';
    lines.push(`- Chez ${c.domain} : ${fmtPrice(c.lastPriceCents, cur)}${stockTxt}${isMin}. Lien : ${c.url}. Dernier check : ${lastFetched}.`);
  }
  lines.push('');
  lines.push(`Ce document a été généré automatiquement par le comparateur de prix GLD le ${new Date().toLocaleString('fr-FR')}.`);
  return lines.join('\n');
}

/**
 * Sync 1 watch dans le RAG (delete ancien doc → ingest nouveau).
 */
export async function syncWatchToRag(watchId: string): Promise<{ docId: string; chunks: number }> {
  const watch = await prisma.priceWatch.findUnique({
    where: { id: watchId },
    include: { competitors: true },
  });
  if (!watch) throw new Error('watch introuvable');

  const sourceTag = `price-watch://${watchId}`;
  // Supprime l'ancien doc s'il existe (replace strategy)
  await prisma.knowledgeDoc.deleteMany({ where: { source: sourceTag } });

  const content = watchToMarkdown(watch);
  const result = await ingestDocument({
    title: `Prix : ${watch.name}`,
    content,
    source: sourceTag,
    sourceType: 'url' as any, // 'url' pour rester compatible avec l'enum sourceType existante
    author: 'GLD price-comparator',
    tags: ['prix', 'comparateur', ...(watch.tags || []), watch.brand?.toLowerCase()].filter(Boolean) as string[],
    locale: 'fr',
  });

  return { docId: result.doc.id, chunks: result.chunkCount };
}

/**
 * Sync tous les watches actifs dans le RAG (cron quotidien).
 */
export async function syncAllWatchesToRag(opts: { onlyUpdatedSince?: Date } = {}): Promise<{
  processed: number;
  totalChunks: number;
  errors: { watchId: string; message: string }[];
}> {
  const where: any = { active: true };
  if (opts.onlyUpdatedSince) where.updatedAt = { gte: opts.onlyUpdatedSince };

  const watches = await prisma.priceWatch.findMany({ where, select: { id: true } });
  let totalChunks = 0;
  const errors: { watchId: string; message: string }[] = [];

  for (const w of watches) {
    try {
      const r = await syncWatchToRag(w.id);
      totalChunks += r.chunks;
    } catch (e: any) {
      errors.push({ watchId: w.id, message: e?.message || 'unknown' });
    }
  }

  return { processed: watches.length, totalChunks, errors };
}
