/**
 * tariff-parser — parse les fichiers de tarifs fournisseurs (CSV/XML/JSON/Excel).
 *
 * Stratégie : zéro dépendance npm lourde. CSV maison robuste (gère guillemets, échappements,
 * délimiteurs FR/EN), XML basique via regex pour les structures simples (Excel-XML, OCI),
 * JSON natif. Pour Excel binaire (.xlsx) → on demande à l'utilisateur d'exporter en CSV
 * (ou on ajoutera SheetJS plus tard si besoin).
 *
 * Mapping flexible : l'utilisateur définit dans TariffSource.mapping un objet
 *   { sku: "ColA", ean: "ColB", name: "ColC", priceCents: "ColD", currency: "EUR", url?: "ColE" }
 * où la valeur peut être :
 *   - un nom de colonne CSV/XLSX (string)
 *   - un index numérique (number)
 *   - une valeur littérale en JSON ({ "literal": "EUR" }) → applique cette valeur partout
 *   - une expression { "field": "ColC", "transform": "*100" } → multiplie par 100 (HT→TTC, etc.)
 */

export type ParsedRow = {
  sku?: string;
  ean?: string;
  name?: string;
  brand?: string;
  /** Prix EN CENTIMES (entier). Le parser convertit "229,90 €" → 22990. */
  priceCents?: number;
  currency?: string;
  inStock?: boolean;
  url?: string;
  imageUrl?: string;
  /** Toutes les colonnes brutes pour debug */
  raw: Record<string, any>;
};

export type Mapping = {
  sku?: string | number | { field?: string | number; literal?: string; transform?: string };
  ean?: string | number | { field?: string | number; literal?: string; transform?: string };
  name?: string | number | { field?: string | number; literal?: string; transform?: string };
  brand?: string | number | { field?: string | number; literal?: string; transform?: string };
  /** Prix : peut être en € (parser détecte) ou en centimes selon transform */
  price?: string | number | { field?: string | number; literal?: string; transform?: string };
  currency?: string | number | { field?: string | number; literal?: string; transform?: string };
  inStock?: string | number | { field?: string | number; literal?: string; transform?: string };
  url?: string | number | { field?: string | number; literal?: string; transform?: string };
  imageUrl?: string | number | { field?: string | number; literal?: string; transform?: string };
};

export type ParseResult = {
  rows: ParsedRow[];
  totalRows: number;
  errors: { row: number; message: string }[];
  format: 'csv' | 'json' | 'xml' | 'unknown';
  /** Headers détectés (CSV) */
  headers?: string[];
};

/* ─── DÉTECTION DE FORMAT ──────────────────────────────────────── */

export function detectFormat(content: string, fileName?: string): ParseResult['format'] {
  const ext = fileName?.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'json') return 'json';
  if (ext === 'xml') return 'xml';

  // Heuristique sur le contenu
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<')) return 'xml';
  // CSV par défaut si présence de séparateur
  if (/[,;\t]/.test(trimmed.split('\n')[0] || '')) return 'csv';
  return 'unknown';
}

/* ─── CSV PARSER (gère guillemets, échappements, multi-lignes) ─ */

export function parseCsv(content: string, delimiter = ','): { headers: string[]; rows: Record<string, string>[] } {
  // Normalise les fins de ligne
  const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        current.push(field);
        field = '';
      } else if (c === '\n') {
        current.push(field);
        records.push(current);
        current = [];
        field = '';
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    records.push(current);
  }

  // Vire les lignes vides
  const filtered = records.filter((r) => r.some((c) => c.trim() !== ''));
  if (filtered.length === 0) return { headers: [], rows: [] };

  const headers = filtered[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < filtered.length; i++) {
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = filtered[i][j] ?? '';
    }
    rows.push(row);
  }
  return { headers, rows };
}

/* ─── XML PARSER (simplifié pour structures plates) ────────────── */

function parseXmlSimple(content: string): Record<string, string>[] {
  // Extraction des nœuds répétés au 2e niveau (typiquement <products><product>... ou <items><item>...)
  // On détecte le tag conteneur le plus fréquent
  const tagCounts = new Map<string, number>();
  const tagRe = /<([a-zA-Z][a-zA-Z0-9_-]*)[\s>]/g;
  let m;
  while ((m = tagRe.exec(content)) !== null) {
    tagCounts.set(m[1], (tagCounts.get(m[1]) || 0) + 1);
  }
  // Le tag qui apparaît le plus souvent (>5 fois) est probablement le wrapper d'item
  const candidates = [...tagCounts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1]);
  if (candidates.length === 0) return [];
  const itemTag = candidates[0][0];

  // Extraire chaque <itemTag>...</itemTag>
  const itemRe = new RegExp(`<${itemTag}[^>]*>([\\s\\S]*?)<\\/${itemTag}>`, 'g');
  const rows: Record<string, string>[] = [];
  let it;
  while ((it = itemRe.exec(content)) !== null) {
    const inner = it[1];
    const row: Record<string, string> = {};
    // Récupère chaque <field>value</field>
    const fieldRe = /<([a-zA-Z][a-zA-Z0-9_-]*)[^>]*>([\s\S]*?)<\/\1>/g;
    let f;
    while ((f = fieldRe.exec(inner)) !== null) {
      row[f[1]] = decodeEntities(f[2].trim());
    }
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return rows;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* ─── MAPPING UTILITIES ────────────────────────────────────────── */

function resolveField(row: Record<string, any>, headers: string[] | undefined, key: any): any {
  if (key == null) return undefined;
  if (typeof key === 'object') {
    if ('literal' in key && key.literal !== undefined) return key.literal;
    let val = resolveField(row, headers, key.field);
    if (key.transform && typeof val === 'string') {
      val = applyTransform(val, key.transform);
    }
    return val;
  }
  if (typeof key === 'number') {
    if (headers && headers[key]) return row[headers[key]];
    // Fallback : indexation directe sur les valeurs
    return Object.values(row)[key];
  }
  if (typeof key === 'string') return row[key];
  return undefined;
}

function applyTransform(value: string, transform: string): string {
  // Transforms supportés : "*100" → multiplie par 100, "/1.2" → divise (TTC→HT), "trim", "uppercase"
  if (transform === 'trim') return value.trim();
  if (transform === 'uppercase') return value.toUpperCase();
  if (transform === 'lowercase') return value.toLowerCase();
  const op = transform.match(/^([*\/])([\d.]+)$/);
  if (op) {
    const n = parseFloat(value.replace(',', '.'));
    if (isNaN(n)) return value;
    const factor = parseFloat(op[2]);
    return op[1] === '*' ? String(n * factor) : String(n / factor);
  }
  return value;
}

function parsePrice(raw: any): { cents?: number; currency?: string } {
  if (raw == null) return {};
  const s = String(raw).trim();
  if (!s) return {};
  // Extraire devise
  let currency: string | undefined;
  if (/€|EUR/i.test(s)) currency = 'EUR';
  else if (/\$|USD/i.test(s)) currency = 'USD';
  else if (/£|GBP/i.test(s)) currency = 'GBP';
  // Extraire chiffre
  const cleaned = s.replace(/[^\d.,-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0) return { currency };
  return { cents: Math.round(n * 100), currency };
}

function parseBool(raw: any): boolean | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toLowerCase();
  if (['1', 'true', 'oui', 'yes', 'instock', 'in_stock', 'in stock', 'dispo', 'disponible', 'available'].includes(s)) return true;
  if (['0', 'false', 'non', 'no', 'outofstock', 'out_of_stock', 'rupture', 'épuisé', 'epuise', 'unavailable'].includes(s)) return false;
  return undefined;
}

/* ─── PARSE PRINCIPAL ─────────────────────────────────────────── */

export function parseTariff(content: string, opts: {
  format?: ParseResult['format'];
  fileName?: string;
  csvDelimiter?: string;
  mapping: Mapping;
}): ParseResult {
  const format = opts.format || detectFormat(content, opts.fileName);
  const errors: ParseResult['errors'] = [];
  const out: ParsedRow[] = [];
  let headers: string[] | undefined;
  let rawRows: Record<string, any>[] = [];

  try {
    if (format === 'csv') {
      const parsed = parseCsv(content, opts.csvDelimiter || ',');
      headers = parsed.headers;
      rawRows = parsed.rows;
    } else if (format === 'json') {
      const data = JSON.parse(content);
      rawRows = Array.isArray(data) ? data : (data?.products || data?.items || data?.data || []);
    } else if (format === 'xml') {
      rawRows = parseXmlSimple(content);
    } else {
      errors.push({ row: 0, message: `Format non supporté : ${format}` });
      return { rows: [], totalRows: 0, errors, format };
    }
  } catch (e: any) {
    errors.push({ row: 0, message: `Parse error : ${e?.message || 'unknown'}` });
    return { rows: [], totalRows: 0, errors, format };
  }

  // Applique le mapping ligne par ligne
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    try {
      const skuRaw = resolveField(row, headers, opts.mapping.sku);
      const eanRaw = resolveField(row, headers, opts.mapping.ean);
      const nameRaw = resolveField(row, headers, opts.mapping.name);
      const brandRaw = resolveField(row, headers, opts.mapping.brand);
      const priceRaw = resolveField(row, headers, opts.mapping.price);
      const currencyRaw = resolveField(row, headers, opts.mapping.currency);
      const inStockRaw = resolveField(row, headers, opts.mapping.inStock);
      const urlRaw = resolveField(row, headers, opts.mapping.url);
      const imageRaw = resolveField(row, headers, opts.mapping.imageUrl);

      const priceParsed = parsePrice(priceRaw);
      const finalCurrency = (typeof currencyRaw === 'string' && currencyRaw.trim()) || priceParsed.currency || 'EUR';

      // Au moins un identifiant produit + un prix
      if (!skuRaw && !eanRaw && !nameRaw) {
        errors.push({ row: i + 1, message: 'aucun identifiant (sku/ean/name)' });
        continue;
      }
      if (priceParsed.cents === undefined) {
        errors.push({ row: i + 1, message: `prix invalide : ${priceRaw}` });
        continue;
      }

      out.push({
        sku: skuRaw ? String(skuRaw).trim() : undefined,
        ean: eanRaw ? String(eanRaw).trim().replace(/\D/g, '') : undefined,
        name: nameRaw ? String(nameRaw).trim() : undefined,
        brand: brandRaw ? String(brandRaw).trim() : undefined,
        priceCents: priceParsed.cents,
        currency: finalCurrency.toUpperCase(),
        inStock: parseBool(inStockRaw),
        url: urlRaw ? String(urlRaw).trim() : undefined,
        imageUrl: imageRaw ? String(imageRaw).trim() : undefined,
        raw: row,
      });
    } catch (e: any) {
      errors.push({ row: i + 1, message: e?.message || 'unknown' });
    }
  }

  return { rows: out, totalRows: rawRows.length, errors: errors.slice(0, 50), format, headers };
}

/* ─── HELPER : SHA-256 d'un buffer (dédup) ─────────────────────── */

export async function sha256(content: string): Promise<string> {
  const enc = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
