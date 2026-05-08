/**
 * price-extractor — extrait prix/dispo/marque depuis une page produit e-commerce.
 *
 * 3 stratégies en cascade par ordre de fiabilité :
 *   1. JSON-LD schema.org/Product  (le plus fiable, 80% des sites e-commerce sérieux)
 *   2. Microdata schema.org         (15% restants)
 *   3. Regex sur balises meta + texte (fallback dernier recours)
 *
 * Réutilise polite-fetch (UA rotation, throttle, backoff) pour éviter blacklist.
 */

import { politeFetch } from './polite-fetch';

export type ExtractedPrice = {
  url: string;
  domain: string;
  title?: string;
  brand?: string;
  /** EAN-13 / GTIN-13 si trouvé */
  ean?: string;
  /** SKU constructeur ou réf vendeur */
  sku?: string;
  /** Prix en centimes (entier) — clé du système */
  priceCents?: number;
  /** Prix barré / ancien prix (centimes) si promo */
  oldPriceCents?: number;
  currency?: string;
  inStock?: boolean;
  imageUrl?: string;
  /** Méthode d'extraction utilisée (debug) */
  method: 'json-ld' | 'microdata' | 'regex' | 'failed';
  /** Statut HTTP brut */
  httpStatus: number;
  /** Erreur si extraction KO */
  error?: string;
};

/* ─── HELPERS ──────────────────────────────────────────────────── */

function priceToCents(raw: any): number | undefined {
  if (raw == null) return undefined;
  // Accepte string "229,90" ou number 229.9
  const s = String(raw).replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

function normalizeCurrency(raw: any): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.toUpperCase().trim();
  if (/^[A-Z]{3}$/.test(s)) return s;
  // Symboles courants
  if (s === '€' || s === 'EUR' || s.includes('EUR')) return 'EUR';
  if (s === '$' || s === 'USD') return 'USD';
  if (s === '£' || s === 'GBP') return 'GBP';
  return undefined;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return ''; }
}

/* ─── STRATÉGIE 1 : JSON-LD ───────────────────────────────────── */

/**
 * Parse le HTML, extrait tous les blocs <script type="application/ld+json">,
 * cherche un objet @type Product et retourne ses infos prix.
 */
function extractFromJsonLd(html: string): Partial<ExtractedPrice> | null {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const inner = block
      .replace(/^<script[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim();
    try {
      const data = JSON.parse(inner);
      const candidates = Array.isArray(data) ? data : data?.['@graph'] ?? [data];
      for (const node of candidates) {
        if (!node || typeof node !== 'object') continue;
        const type = node['@type'];
        const isProduct =
          type === 'Product' ||
          (Array.isArray(type) && type.includes('Product'));
        if (!isProduct) continue;

        const out: Partial<ExtractedPrice> = { method: 'json-ld' };
        out.title = typeof node.name === 'string' ? node.name : undefined;
        out.brand = typeof node.brand === 'string'
          ? node.brand
          : (node.brand?.name || undefined);
        out.ean = node.gtin13 || node.gtin || node.gtin8 || node.ean || undefined;
        out.sku = node.sku || node.mpn || undefined;
        out.imageUrl = Array.isArray(node.image) ? node.image[0] : node.image;

        // Offres : peut être objet, tableau, AggregateOffer
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        if (offers) {
          out.priceCents = priceToCents(offers.price ?? offers.lowPrice);
          out.currency = normalizeCurrency(offers.priceCurrency);
          if (offers.priceSpecification) {
            const spec = Array.isArray(offers.priceSpecification)
              ? offers.priceSpecification[0]
              : offers.priceSpecification;
            if (!out.priceCents) out.priceCents = priceToCents(spec.price);
            if (!out.currency) out.currency = normalizeCurrency(spec.priceCurrency);
          }
          // Dispo
          const avail = String(offers.availability || '').toLowerCase();
          if (avail.includes('instock')) out.inStock = true;
          else if (avail.includes('outofstock') || avail.includes('soldout')) out.inStock = false;
        }

        // Si on a au moins un prix → on retourne (extraction réussie)
        if (out.priceCents !== undefined) return out;
        // Sinon on garde les infos partielles et on continue à chercher
        if (out.title || out.brand) return out;
      }
    } catch { /* JSON-LD malformé : on continue avec le bloc suivant */ }
  }
  return null;
}

/* ─── STRATÉGIE 2 : MICRODATA ──────────────────────────────────── */

function extractFromMicrodata(html: string): Partial<ExtractedPrice> | null {
  // Cherche un itemtype=...Product
  if (!/itemtype=["'][^"']*schema\.org\/Product["']/i.test(html)) return null;
  const out: Partial<ExtractedPrice> = { method: 'microdata' };

  const grab = (prop: string): string | undefined => {
    const m = html.match(new RegExp(`itemprop=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*itemprop=["']${prop}["']`, 'i'))
      || html.match(new RegExp(`itemprop=["']${prop}["'][^>]*>([^<]+)<`, 'i'));
    return m ? decodeHtmlEntities(m[1]).trim() : undefined;
  };

  out.title = grab('name');
  out.brand = grab('brand');
  out.priceCents = priceToCents(grab('price'));
  out.currency = normalizeCurrency(grab('priceCurrency'));
  out.ean = grab('gtin13') || grab('gtin') || grab('ean');
  out.sku = grab('sku') || grab('mpn');
  out.imageUrl = grab('image');
  const avail = grab('availability') || '';
  if (/instock/i.test(avail)) out.inStock = true;
  else if (/outofstock|soldout/i.test(avail)) out.inStock = false;

  return out.priceCents !== undefined || out.title ? out : null;
}

/* ─── STRATÉGIE 3 : OG + REGEX ─────────────────────────────────── */

function extractFromRegex(html: string): Partial<ExtractedPrice> | null {
  const out: Partial<ExtractedPrice> = { method: 'regex' };

  // Open Graph product:price
  const ogPrice = html.match(/<meta\s+(?:property|name)=["']product:price:amount["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+(?:property|name)=["']og:price:amount["']\s+content=["']([^"']+)["']/i);
  if (ogPrice) out.priceCents = priceToCents(ogPrice[1]);

  const ogCur = html.match(/<meta\s+(?:property|name)=["'](?:product|og):price:currency["']\s+content=["']([^"']+)["']/i);
  if (ogCur) out.currency = normalizeCurrency(ogCur[1]);

  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogTitle) out.title = decodeHtmlEntities(ogTitle[1]);

  const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImage) out.imageUrl = ogImage[1];

  // Fallback ultime : cherche "229,90 €" ou "$229.90" dans le DOM, près d'un mot-clé "prix"/"price"
  if (!out.priceCents) {
    const priceRegex = /(\d{1,4}[.,]\d{2})\s*(€|EUR|\$|USD|£|GBP)/g;
    const matches = [...html.matchAll(priceRegex)];
    if (matches.length > 0) {
      // Prend le premier prix trouvé (souvent le bon sur une fiche produit)
      out.priceCents = priceToCents(matches[0][1]);
      out.currency = normalizeCurrency(matches[0][2]);
    }
  }

  return out.priceCents !== undefined ? out : null;
}

/* ─── EXTRACTION MAIN ─────────────────────────────────────────── */

export async function extractPriceFromUrl(url: string): Promise<ExtractedPrice> {
  const domain = getDomain(url);
  const base: ExtractedPrice = { url, domain, method: 'failed', httpStatus: 0 };

  let html = '';
  try {
    const r = await politeFetch(url, {
      polite: true,
      timeoutMs: 15_000,
      accept: 'text/html,application/xhtml+xml',
    });
    base.httpStatus = r.status;
    if (!r.ok) {
      base.error = `HTTP ${r.status}`;
      return base;
    }
    html = r.text;
  } catch (e: any) {
    base.error = e?.message || 'fetch failed';
    return base;
  }

  // Cascade des stratégies
  const result =
    extractFromJsonLd(html) ||
    extractFromMicrodata(html) ||
    extractFromRegex(html);

  if (!result) {
    base.error = 'aucune méthode n\'a pu extraire le prix';
    return base;
  }

  return { ...base, ...result };
}

/**
 * Extrait plusieurs URLs en parallèle (4 workers max).
 */
export async function extractMultiple(urls: string[]): Promise<ExtractedPrice[]> {
  const results: ExtractedPrice[] = [];
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const u = queue.shift();
      if (!u) break;
      try {
        results.push(await extractPriceFromUrl(u));
      } catch (e: any) {
        results.push({
          url: u, domain: getDomain(u), method: 'failed', httpStatus: 0,
          error: e?.message || 'crash',
        });
      }
    }
  });
  await Promise.all(workers);
  return results;
}
