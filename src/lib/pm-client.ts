/**
 * pm-client — wrapper de l'API productsmanager.app (PIM B2B).
 *
 * L'API n'est pas publique (apidocs.productsmanager.app demande auth) donc on fait
 * un client générique configurable : base URL, API key, endpoints param.
 * L'admin colle ses credentials dans Settings (`integrations.pm.*`) et on appelle.
 *
 * Stratégie : on ne suppose pas une structure exacte de l'API, on tente plusieurs
 * patterns courants (REST classique : /products, /products/{id}, /catalog, etc.)
 * et on rend l'extraction flexible via mapping.
 *
 * Endpoints supposés (à confirmer côté admin) :
 *   GET  {baseUrl}/products?limit=100&offset=0      → liste paginée
 *   GET  {baseUrl}/products/{id}                    → détail
 *   POST {baseUrl}/webhooks                         → enregistrer webhook (optionnel)
 *
 * Auth : header `Authorization: Bearer {apiKey}` ou `X-API-Key: {apiKey}` (configurable).
 */

import { getSettings } from './settings';

export type PmProduct = {
  id: string;
  sku?: string;
  ean?: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  priceCents?: number;
  currency?: string;
  /** Données brutes (debug + fallback mapping) */
  raw: any;
};

export type PmConfig = {
  baseUrl: string;
  apiKey: string;
  authHeader?: 'Authorization' | 'X-API-Key'; // défaut Authorization
  authPrefix?: string;                          // défaut "Bearer "
  /** Endpoint listing (chemin relatif). Défaut "/products". */
  productsEndpoint?: string;
  /** Mapping des champs PM → champs internes (au cas où l'API utilise des noms différents). */
  fieldMapping?: {
    id?: string;       // défaut "id"
    sku?: string;      // défaut "sku"
    ean?: string;      // défaut "ean" (essaie aussi gtin13, barcode)
    name?: string;     // défaut "name" (essaie aussi title, label)
    brand?: string;    // défaut "brand"
    category?: string; // défaut "category"
    image?: string;    // défaut "imageUrl" (essaie aussi image, picture, photo)
    price?: string;    // défaut "price" (en €, pas en centimes)
    currency?: string; // défaut "currency"
  };
};

/* ─── HELPERS ──────────────────────────────────────────────────── */

async function getPmConfig(): Promise<PmConfig | null> {
  try {
    const s = await getSettings([
      'integrations.pm.baseUrl',
      'integrations.pm.apiKey',
      'integrations.pm.authHeader',
      'integrations.pm.authPrefix',
      'integrations.pm.productsEndpoint',
      'integrations.pm.fieldMapping',
    ]);
    const baseUrl = s['integrations.pm.baseUrl'] || process.env.PM_API_URL || 'https://app.productsmanager.app/api';
    const apiKey = s['integrations.pm.apiKey'] || process.env.PM_API_KEY || '';
    if (!apiKey) return null;
    let fieldMapping: any = undefined;
    if (s['integrations.pm.fieldMapping']) {
      try { fieldMapping = JSON.parse(s['integrations.pm.fieldMapping']); } catch {}
    }
    return {
      baseUrl: baseUrl.replace(/\/$/, ''),
      apiKey,
      authHeader: (s['integrations.pm.authHeader'] as any) || 'Authorization',
      authPrefix: s['integrations.pm.authPrefix'] ?? 'Bearer ',
      productsEndpoint: s['integrations.pm.productsEndpoint'] || '/products',
      fieldMapping,
    };
  } catch {
    return null;
  }
}

function pickField(raw: any, keys: string[]): any {
  for (const k of keys) {
    if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k];
  }
  return undefined;
}

function priceToCents(raw: any): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  if (isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

/** Normalise un produit PM brut en PmProduct typé via le mapping configurable. */
export function normalizePmProduct(raw: any, mapping?: PmConfig['fieldMapping']): PmProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = mapping || {};
  const id = raw[m.id || 'id'] || raw.uuid || raw._id;
  if (!id) return null;
  return {
    id: String(id),
    sku: pickField(raw, [m.sku || 'sku', 'reference', 'ref']),
    ean: pickField(raw, [m.ean || 'ean', 'gtin13', 'gtin', 'barcode', 'eanCode']),
    name: pickField(raw, [m.name || 'name', 'title', 'label', 'designation']),
    brand: typeof pickField(raw, [m.brand || 'brand', 'manufacturer']) === 'object'
      ? pickField(raw, [m.brand || 'brand'])?.name
      : pickField(raw, [m.brand || 'brand', 'manufacturer']),
    category: typeof pickField(raw, [m.category || 'category']) === 'object'
      ? pickField(raw, [m.category || 'category'])?.name
      : pickField(raw, [m.category || 'category', 'categoryName']),
    description: pickField(raw, ['description', 'shortDescription']),
    imageUrl: typeof pickField(raw, [m.image || 'imageUrl', 'image', 'picture', 'photo']) === 'object'
      ? pickField(raw, [m.image || 'imageUrl', 'image'])?.url
      : pickField(raw, [m.image || 'imageUrl', 'image', 'picture', 'photo', 'thumbnail']),
    priceCents: priceToCents(pickField(raw, [m.price || 'price', 'priceTtc', 'priceHt', 'unitPrice'])),
    currency: pickField(raw, [m.currency || 'currency']) || 'EUR',
    raw,
  };
}

/* ─── API CALLS ────────────────────────────────────────────────── */

export class PmApiError extends Error {
  constructor(public status: number, public body: string, msg: string) { super(msg); }
}

async function pmFetch(path: string, opts: { method?: string; body?: any } = {}): Promise<any> {
  const cfg = await getPmConfig();
  if (!cfg) throw new Error('Config productsmanager.app manquante (settings integrations.pm.*)');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  headers[cfg.authHeader || 'Authorization'] = `${cfg.authPrefix || 'Bearer '}${cfg.apiKey}`;
  const r = await fetch(`${cfg.baseUrl}${path.startsWith('/') ? path : '/' + path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    throw new PmApiError(r.status, txt, `PM API ${r.status} sur ${path} : ${txt.slice(0, 200)}`);
  }
  return r.json();
}

/**
 * Liste les produits du PIM. Pagine automatiquement jusqu'à `maxItems`.
 * Retourne les produits normalisés.
 */
export async function listPmProducts(opts: { maxItems?: number; pageSize?: number } = {}): Promise<PmProduct[]> {
  const cfg = await getPmConfig();
  if (!cfg) throw new Error('Config PM manquante');
  const max = opts.maxItems ?? 500;
  const pageSize = opts.pageSize ?? 100;
  const endpoint = cfg.productsEndpoint || '/products';
  const out: PmProduct[] = [];
  let offset = 0;

  while (out.length < max) {
    const remaining = max - out.length;
    const limit = Math.min(pageSize, remaining);
    const page = await pmFetch(`${endpoint}?limit=${limit}&offset=${offset}`);
    // Réponse peut être : array direct, { data: [...] }, { products: [...] }, { items: [...] }
    const items: any[] = Array.isArray(page)
      ? page
      : (page.data || page.products || page.items || page.results || []);
    if (items.length === 0) break;
    for (const raw of items) {
      const norm = normalizePmProduct(raw, cfg.fieldMapping);
      if (norm) out.push(norm);
    }
    if (items.length < limit) break; // dernière page
    offset += items.length;
    if (offset > 50_000) break; // safeguard
  }

  return out;
}

/** Récupère un produit par ID. */
export async function getPmProduct(id: string): Promise<PmProduct | null> {
  const cfg = await getPmConfig();
  if (!cfg) throw new Error('Config PM manquante');
  const endpoint = cfg.productsEndpoint || '/products';
  const raw = await pmFetch(`${endpoint}/${encodeURIComponent(id)}`);
  return normalizePmProduct(raw, cfg.fieldMapping);
}

/** Test de connectivité : tente de récupérer 1 produit et renvoie le résultat. */
export async function testPmConnection(): Promise<{ ok: boolean; sampleProduct?: PmProduct; error?: string; status?: number }> {
  try {
    const products = await listPmProducts({ maxItems: 1, pageSize: 1 });
    return { ok: true, sampleProduct: products[0] };
  } catch (e: any) {
    if (e instanceof PmApiError) {
      return { ok: false, error: e.message, status: e.status };
    }
    return { ok: false, error: e?.message || 'unknown' };
  }
}
