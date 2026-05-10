/**
 * scrape-adapters/web — adapter web générique.
 *
 * Prend une URL, fetch HTML via polite-fetch (anti-blacklist),
 * extrait emails/téls/WhatsApp/handles via contact-detectors,
 * suit les liens internes pertinents (depth ≤ 2) :
 *   /contact, /contact-us, /contactez-nous
 *   /about, /a-propos, /qui-sommes-nous
 *   /team, /equipe, /staff
 *   /imprint, /impressum, /mentions-legales
 *
 * Fallback Jina Reader si polite-fetch reçoit 403/429.
 */

import { politeFetch, politeFetchText, type PoliteFetchOptions } from '../polite-fetch';
import {
  extractAllContacts,
  type ExtractedContacts,
  type CanonicalContact,
  dedupeContacts
} from '../contact-detectors';
import type { CountryCode } from 'libphonenumber-js';

export type WebScrapeOptions = {
  url: string;
  depth?: number;            // 0 = juste cette URL, 1 = + liens contact, 2 = +sous-liens (default 1)
  maxPages?: number;         // hard limit (default 8)
  defaultCountry?: CountryCode;
  hostDelayMs?: number;      // throttle politeFetch
  followExternalLinks?: boolean; // default false
  jinaFallback?: boolean;    // default true — bascule sur Jina si bloqué
  userAgent?: 'desktop' | 'mobile' | 'auto';
};

export type WebScrapeResult = {
  url: string;
  pagesVisited: string[];
  pagesSucceeded: number;
  pagesFailed: number;
  pagesBlocked: number;
  durationMs: number;
  contacts: CanonicalContact[];
  rawExtractions: { url: string; extraction: ExtractedContacts }[];
  errors: { url: string; reason: string }[];
};

const CONTACT_PATH_PATTERNS = [
  // EN
  '/contact', '/contact-us', '/contacts', '/get-in-touch', '/reach-us',
  '/about', '/about-us',
  '/team', '/our-team', '/staff', '/people',
  '/imprint', '/impressum', '/legal', '/legal-notice',
  // FR
  '/a-propos', '/apropos', '/qui-sommes-nous', '/qui-nous-sommes',
  '/contactez-nous', '/contactez',
  '/equipe', '/notre-equipe',
  '/mentions-legales', '/mentions',
  // DE
  '/kontakt', '/ueber-uns', '/team',
  // ES/IT
  '/contacto', '/contatti', '/sobre-nosotros', '/chi-siamo'
];

/* ─── HTML → TEXT (light) ─────────────────────────────────────── */

function htmlToText(html: string): string {
  // Supprime scripts + styles
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  // Garde les liens en cherchant href + texte (utile pour Mariages.net qui met les téls dans des href tel:)
  s = s.replace(/<a[^>]*href=["']tel:([^"']+)["'][^>]*>/gi, ' tel:$1 ');
  s = s.replace(/<a[^>]*href=["']mailto:([^"']+)["'][^>]*>/gi, ' mailto:$1 ');
  // Préserve les attributs data-cfemail (déjà décodés en amont par detectors)
  s = s.replace(/<a[^>]*data-cfemail=["']([^"']+)["'][^>]*>/gi, ' data-cfemail="$1" ');
  // Vire toutes les autres balises
  s = s.replace(/<[^>]+>/g, ' ');
  // Décode les entités HTML basiques
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/* ─── EXTRACTION DE LIENS INTERNES PERTINENTS ────────────────── */

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const base = new URL(baseUrl);
  const baseDomain = base.hostname.replace(/^www\./, '');

  // 1. Liens <a href>
  const linkRe = /href=["']([^"'#]+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    let href = m[1].trim();
    if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const abs = new URL(href, baseUrl);
      const dom = abs.hostname.replace(/^www\./, '');
      if (dom !== baseDomain) continue; // interne uniquement
      const path = abs.pathname.toLowerCase();
      // Match contact patterns
      if (CONTACT_PATH_PATTERNS.some((p) => path.startsWith(p) || path.endsWith(p))) {
        links.add(abs.toString());
      }
    } catch {
      // skip URLs malformées
    }
  }

  return Array.from(links).slice(0, 6); // cap à 6 sous-liens
}

/* ─── FALLBACK JINA READER ───────────────────────────────────── */

const JINA_BASE = 'https://r.jina.ai/';

async function fetchViaJina(url: string): Promise<{ ok: boolean; text?: string; status?: number; reason?: string }> {
  try {
    const r = await fetch(`${JINA_BASE}${url}`, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain',
        'X-Return-Format': 'text'
      },
      signal: AbortSignal.timeout(15_000)
    });
    if (!r.ok) return { ok: false, status: r.status, reason: 'jina-error' };
    const text = await r.text();
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'jina-network' };
  }
}

/* ─── FETCH PAGE (avec fallback) ─────────────────────────────── */

async function fetchPage(
  url: string,
  opts: { hostDelayMs?: number; jinaFallback: boolean }
): Promise<{ html: string | null; status: 'success' | 'blocked' | 'failed'; via: 'polite' | 'jina' | null; reason?: string }> {
  const fetchOpts: PoliteFetchOptions = {
    hostDelayMs: opts.hostDelayMs,
    timeoutMs: 12_000
  };

  try {
    const r = await politeFetch(url, fetchOpts);
    if (r.ok && r.text) {
      return { html: r.text, status: 'success', via: 'polite' };
    }
    // Si bloqué (403/429) → fallback Jina
    if ((r.status === 403 || r.status === 429 || r.status === 503) && opts.jinaFallback) {
      const jr = await fetchViaJina(url);
      if (jr.ok && jr.text) {
        return { html: jr.text, status: 'success', via: 'jina' };
      }
      return { html: null, status: 'blocked', via: null, reason: `polite ${r.status} + jina ${jr.reason || jr.status}` };
    }
    return { html: null, status: 'failed', via: null, reason: `HTTP ${r.status}` };
  } catch (e: any) {
    if (opts.jinaFallback) {
      const jr = await fetchViaJina(url);
      if (jr.ok && jr.text) return { html: jr.text, status: 'success', via: 'jina' };
    }
    return { html: null, status: 'failed', via: null, reason: e?.message };
  }
}

/* ─── ADAPTER PRINCIPAL ──────────────────────────────────────── */

export async function scrapeWebUrl(opts: WebScrapeOptions): Promise<WebScrapeResult> {
  const startedAt = Date.now();
  const depth = opts.depth ?? 1;
  const maxPages = opts.maxPages ?? 8;
  const country = opts.defaultCountry || 'FR';
  const jinaFallback = opts.jinaFallback !== false;

  const visited = new Set<string>();
  const queue: { url: string; level: number }[] = [{ url: opts.url, level: 0 }];
  const result: WebScrapeResult = {
    url: opts.url,
    pagesVisited: [],
    pagesSucceeded: 0,
    pagesFailed: 0,
    pagesBlocked: 0,
    durationMs: 0,
    contacts: [],
    rawExtractions: [],
    errors: []
  };

  while (queue.length > 0 && visited.size < maxPages) {
    const { url, level } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    result.pagesVisited.push(url);

    const fetched = await fetchPage(url, {
      hostDelayMs: opts.hostDelayMs,
      jinaFallback
    });

    if (fetched.status !== 'success' || !fetched.html) {
      if (fetched.status === 'blocked') result.pagesBlocked++;
      else result.pagesFailed++;
      result.errors.push({ url, reason: fetched.reason || 'unknown' });
      continue;
    }
    result.pagesSucceeded++;

    // Convertit HTML → texte (avec préservation des href tel:/mailto:/cfemail)
    const text = htmlToText(fetched.html);

    // Extract contacts
    const extraction = extractAllContacts(text, { defaultCountry: country, source: url });
    result.rawExtractions.push({ url, extraction });

    // Suit les liens internes contact si depth > 0
    if (level < depth) {
      const internalLinks = extractInternalLinks(fetched.html, url);
      for (const l of internalLinks) {
        if (!visited.has(l) && queue.length + visited.size < maxPages) {
          queue.push({ url: l, level: level + 1 });
        }
      }
    }
  }

  // Dédoublonne tous les contacts trouvés
  result.contacts = dedupeContacts(result.rawExtractions.map((r) => r.extraction));
  result.durationMs = Date.now() - startedAt;

  return result;
}

/* ─── HELPER : sitemap parsing ───────────────────────────────── */

/** Récupère URL du sitemap.xml et liste les pages prioritaires (contact/about). */
export async function fetchSitemapUrls(siteUrl: string): Promise<string[]> {
  const base = new URL(siteUrl);
  const candidates = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
    `${base.origin}/sitemap-pages.xml`
  ];

  for (const sitemap of candidates) {
    try {
      const text = await politeFetchText(sitemap, { timeoutMs: 8000 });
      if (!text) continue;
      const urls: string[] = [];
      const re = /<loc>([^<]+)<\/loc>/gi;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        urls.push(m[1].trim());
      }
      if (urls.length > 0) {
        // Filtre les URLs prioritaires
        return urls
          .filter((u) => CONTACT_PATH_PATTERNS.some((p) => u.toLowerCase().includes(p)))
          .slice(0, 20);
      }
    } catch {}
  }

  return [];
}
