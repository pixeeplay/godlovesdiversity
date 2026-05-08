/**
 * Scraper haute-qualité pour le RAG « Demandez à GLD ».
 *
 * Stack : Jina Reader (r.jina.ai) → markdown propre → ingestion RAG.
 *
 * Pourquoi Jina Reader plutôt que strip-tags maison :
 *   - Rend les pages JS dynamiques (SPA, FB events, etc.)
 *   - Cleanup HTML pro (vire navs, footers, scripts, ads)
 *   - Renvoie du markdown structuré (titres, listes, liens conservés)
 *   - Gratuit jusqu'à ~20 req/min sans clé, illimité avec JINA_API_KEY
 *
 * Fallback : si Jina renvoie autre chose qu'un 200 ou un markdown vide,
 * on retombe sur un fetch direct + strip-tags (l'ancien comportement).
 *
 * Optionnel : si GEMINI_API_KEY est présente et que l'option `summarize` est
 * activée, on utilise Gemini 2.5 Flash Lite avec structured output pour
 * extraire un résumé propre + langue détectée + tags suggérés.
 */
import { getSettings } from './settings';

export type ScrapeResult = {
  title: string;
  content: string;            // Markdown propre prêt pour chunking RAG
  url: string;                // URL canonique
  source: 'jina' | 'fetch';   // D'où vient le contenu (utile pour debug)
  lang?: string;              // Langue détectée si dispo (ISO 639-1)
  tags?: string[];            // Tags suggérés par Gemini si summarize=true
  summary?: string;           // Résumé court si summarize=true
  bytes: number;              // Taille du markdown final
  warning?: string;           // Avertissement non-bloquant (ex: "Jina KO, fallback")
};

const JINA_BASE = 'https://r.jina.ai/';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_CONTENT_CHARS = 80_000; // ~20K tokens, cap raisonnable pour le RAG

/* ─── HELPERS CLÉS ─────────────────────────────────────────────── */

async function getJinaKey(): Promise<string | null> {
  // 1. Settings DB (priorité, modifiable depuis l'admin)
  try {
    const s = await getSettings(['integrations.jina.apiKey']);
    if (s['integrations.jina.apiKey']) return s['integrations.jina.apiKey'] as string;
  } catch { /* settings KO en build, on ignore */ }
  // 2. Env var
  return process.env.JINA_API_KEY || null;
}

async function getGeminiKey(): Promise<string | null> {
  try {
    const s = await getSettings(['integrations.gemini.apiKey']);
    if (s['integrations.gemini.apiKey']) return s['integrations.gemini.apiKey'] as string;
  } catch { /* idem */ }
  return process.env.GEMINI_API_KEY || null;
}

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    // Vire les params trackers courants
    ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'ref'].forEach(
      (p) => parsed.searchParams.delete(p)
    );
    return parsed.toString();
  } catch {
    return u;
  }
}

/* ─── JINA READER ──────────────────────────────────────────────── */

async function fetchViaJina(url: string): Promise<{ title: string; content: string } | null> {
  const key = await getJinaKey();
  const headers: Record<string, string> = {
    Accept: 'text/plain',
    // X-Return-Format=markdown est le défaut, on l'explicite pour éviter les surprises
    'X-Return-Format': 'markdown',
    // Engine readerlm-v2 → meilleur cleanup, légèrement plus lent
    'X-Engine': 'browser',
  };
  if (key) headers.Authorization = `Bearer ${key}`;

  try {
    const r = await fetch(`${JINA_BASE}${url}`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const text = (await r.text()).trim();
    if (text.length < 50) return null; // Page vide / blocked
    // Jina prefixe souvent par "Title: ..." sur la 1re ligne
    const titleMatch = text.match(/^Title:\s*([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : '';
    // Le markdown utile commence après "Markdown Content:" si présent
    const splitIdx = text.indexOf('Markdown Content:');
    const content = splitIdx >= 0 ? text.slice(splitIdx + 'Markdown Content:'.length).trim() : text;
    return { title, content };
  } catch {
    return null;
  }
}

/* ─── FALLBACK : FETCH DIRECT ──────────────────────────────────── */

async function fetchViaPlain(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'GLD-Bot/1.0 (+https://gld.pixeeplay.com)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const html = await r.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : '';
    const content = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return { title, content };
  } catch {
    return null;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* ─── ENRICHISSEMENT GEMINI (optionnel) ────────────────────────── */

type GeminiEnrich = { lang?: string; tags?: string[]; summary?: string };

async function enrichWithGemini(title: string, content: string): Promise<GeminiEnrich> {
  const key = await getGeminiKey();
  if (!key) return {};
  // On envoie max 12K chars au modèle (largement suffisant pour résumer + détecter)
  const sample = content.slice(0, 12_000);
  const prompt = `Analyse ce contenu web et renvoie STRICTEMENT un JSON conforme au schéma — pas de markdown, pas de commentaire.

TITRE : ${title || '(non fourni)'}

CONTENU :
${sample}

Schéma attendu :
{
  "lang": "code ISO 639-1 de la langue dominante (fr, en, es, ar, he, ...)",
  "summary": "résumé en 2 à 4 phrases dans la langue détectée",
  "tags": ["3 à 6 tags courts en minuscules pertinents pour un index RAG sur l'inclusion LGBT+ et les religions"]
}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 400,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                lang: { type: 'STRING' },
                summary: { type: 'STRING' },
                tags: { type: 'ARRAY', items: { type: 'STRING' } },
              },
              required: ['lang', 'summary', 'tags'],
            },
          },
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      }
    );
    if (!r.ok) return {};
    const j = await r.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      lang: typeof parsed.lang === 'string' ? parsed.lang.toLowerCase().slice(0, 5) : undefined,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : undefined,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map((t: any) => String(t).toLowerCase()) : undefined,
    };
  } catch {
    return {};
  }
}

/* ─── API PUBLIQUE ─────────────────────────────────────────────── */

export type ScrapeOptions = {
  /** Active l'enrichissement Gemini (résumé + langue + tags). Coût : ~0.0002$ / page. */
  summarize?: boolean;
  /** Force le passage par fetch direct sans tenter Jina (debug). */
  skipJina?: boolean;
};

/**
 * Scrape une URL et renvoie un contenu propre prêt pour ingestion RAG.
 *
 * Stratégie :
 *   1. Jina Reader (markdown propre, JS rendu)
 *   2. Si Jina KO → fetch direct + strip-tags
 *   3. Si summarize=true → Gemini Flash Lite enrichit avec lang/tags/summary
 */
export async function scrapeUrlForRag(rawUrl: string, opts: ScrapeOptions = {}): Promise<ScrapeResult> {
  const url = normalizeUrl(rawUrl);
  let warning: string | undefined;
  let result: { title: string; content: string } | null = null;
  let source: ScrapeResult['source'] = 'jina';

  if (!opts.skipJina) {
    result = await fetchViaJina(url);
  }

  if (!result) {
    source = 'fetch';
    if (!opts.skipJina) warning = 'Jina indisponible, fallback fetch direct';
    result = await fetchViaPlain(url);
  }

  if (!result) {
    throw new Error(`Impossible de récupérer ${url} (Jina + fetch direct ont échoué)`);
  }

  // Normalise et borne la taille
  const content = result.content.length > MAX_CONTENT_CHARS
    ? result.content.slice(0, MAX_CONTENT_CHARS) + '\n\n[…contenu tronqué…]'
    : result.content;

  const out: ScrapeResult = {
    title: result.title || extractFallbackTitle(content) || url,
    content,
    url,
    source,
    bytes: content.length,
    warning,
  };

  if (opts.summarize) {
    const enrich = await enrichWithGemini(out.title, content);
    out.lang = enrich.lang;
    out.tags = enrich.tags;
    out.summary = enrich.summary;
  }

  return out;
}

function extractFallbackTitle(markdown: string): string | undefined {
  // Premier H1 markdown ou première ligne non vide
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const first = markdown.split('\n').find((l) => l.trim().length > 5);
  return first?.trim().slice(0, 200);
}

/**
 * Scrape plusieurs URLs en parallèle (limit concurrent fixé à 4).
 * Utile pour ingérer un sitemap ou une liste de liens d'un coup.
 */
export async function scrapeManyForRag(urls: string[], opts: ScrapeOptions = {}): Promise<ScrapeResult[]> {
  const out: ScrapeResult[] = [];
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const u = queue.shift();
      if (!u) break;
      try {
        out.push(await scrapeUrlForRag(u, opts));
      } catch (e: any) {
        out.push({
          title: u,
          content: '',
          url: u,
          source: 'fetch',
          bytes: 0,
          warning: e?.message || 'scrape failed',
        });
      }
    }
  });
  await Promise.all(workers);
  return out;
}
