/**
 * polite-fetch — wrapper fetch anti-blacklist pour le scraping RAG.
 *
 * Pourquoi : un scraper qui tape 50 fois sur le même domaine en 2 secondes avec
 * un UA suspect se fait blacklister direct (429, puis IP banni). Ce module
 * rend le scraper "civilisé" :
 *
 *   1. Pool de User-Agents Chrome/Firefox/Safari récents (rotation aléatoire)
 *   2. Headers réalistes (Accept, Accept-Language, sec-ch-ua, etc.)
 *   3. Throttle PAR HOSTNAME : N ms minimum entre 2 requêtes au même domaine
 *   4. Backoff exponentiel sur 429/503/403 (1s → 2s → 4s → 8s, max 3 retries)
 *   5. Respect du Crawl-delay déclaré dans robots.txt
 *   6. Cap concurrent par hostname (par défaut 2 simultanées max)
 *   7. Suggestion de fallback Jina automatique si serveur 403/429
 *
 * Stratégies plus avancées (proxy rotation, résidentiels, etc.) → hors scope,
 * Jina Reader le fait déjà côté lui (ses propres IP) si on lui passe l'URL.
 */

const FETCH_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 3;
const DEFAULT_HOST_DELAY_MS = 800;       // Entre 2 requêtes au même hostname
const DEFAULT_HOST_CONCURRENCY = 2;       // Workers // par hostname
const POLITE_HOST_DELAY_MS = 2_500;       // Mode discret : delay plus long

/* ─── POOL USER-AGENTS RÉALISTES ──────────────────────────────── */

// Mix navigateurs récents (mai 2026 environ). Mis à jour régulièrement c'est mieux.
const USER_AGENTS = [
  // Chrome desktop
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  // Firefox
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
  // Safari
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  // Edge
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
];

function pickUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** Détecte le navigateur depuis le UA pour générer des headers cohérents. */
function browserHints(ua: string): { brand: string; chBrand?: string } {
  if (/Edg\//.test(ua)) return { brand: 'edge', chBrand: '"Microsoft Edge";v="131", "Chromium";v="131", "Not-A.Brand";v="24"' };
  if (/Firefox\//.test(ua)) return { brand: 'firefox' }; // Firefox n'envoie pas sec-ch
  if (/Chrome\//.test(ua)) return { brand: 'chrome', chBrand: '"Chromium";v="132", "Google Chrome";v="132", "Not?A_Brand";v="24"' };
  if (/Safari\//.test(ua)) return { brand: 'safari' };
  return { brand: 'unknown' };
}

/* ─── THROTTLE PAR HOSTNAME ────────────────────────────────────── */

declare global {
  // eslint-disable-next-line no-var
  var __politeFetchState: {
    lastHit: Map<string, number>;
    inflight: Map<string, number>;
    crawlDelays: Map<string, number>;  // Crawl-delay du robots.txt par hostname (ms)
  } | undefined;
}

const state = global.__politeFetchState || {
  lastHit: new Map<string, number>(),
  inflight: new Map<string, number>(),
  crawlDelays: new Map<string, number>(),
};
if (process.env.NODE_ENV !== 'production') global.__politeFetchState = state;

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Note : un Crawl-delay reçu (en secondes), garde le max si plusieurs sources. */
export function rememberCrawlDelay(hostname: string, seconds: number): void {
  if (!hostname || seconds < 0) return;
  const ms = Math.min(60_000, seconds * 1000); // cap 60s pour éviter abus
  const cur = state.crawlDelays.get(hostname) || 0;
  if (ms > cur) state.crawlDelays.set(hostname, ms);
}

/** Attend si nécessaire avant de toucher ce hostname (throttle + concurrency). */
async function waitForHostSlot(host: string, hostDelay: number, hostConcurrency: number): Promise<void> {
  // 1. Cap concurrent
  while ((state.inflight.get(host) || 0) >= hostConcurrency) {
    await sleep(150);
  }
  state.inflight.set(host, (state.inflight.get(host) || 0) + 1);

  // 2. Delay inter-requêtes (max entre hostDelay paramétré et Crawl-delay du robots.txt)
  const minDelay = Math.max(hostDelay, state.crawlDelays.get(host) || 0);
  const last = state.lastHit.get(host) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < minDelay) {
    // Jitter ±20% pour ne pas avoir un timing trop régulier (signature détectable)
    const wait = (minDelay - elapsed) * (0.8 + Math.random() * 0.4);
    await sleep(wait);
  }
  state.lastHit.set(host, Date.now());
}

function releaseHostSlot(host: string): void {
  const cur = state.inflight.get(host) || 1;
  if (cur <= 1) state.inflight.delete(host);
  else state.inflight.set(host, cur - 1);
}

/* ─── FETCH POLI ──────────────────────────────────────────────── */

export type PoliteFetchOptions = {
  /** Mode discret : delays plus longs, concurrence forcée à 1, jitter accentué. */
  polite?: boolean;
  /** Délai min ms entre 2 requêtes au même hostname (défaut 800ms / 2500ms en mode poli). */
  hostDelayMs?: number;
  /** Concurrence max simultanée par hostname (défaut 2 / 1 en mode poli). */
  hostConcurrency?: number;
  /** Override du timeout (défaut 12s). */
  timeoutMs?: number;
  /** Référer à envoyer (utile pour avoir l'air de venir d'un lien interne). */
  referer?: string;
  /** Type de contenu attendu (modifie l'Accept). */
  accept?: string;
  /** Si true : ne fait pas de retry sur 429/503 (retry géré par l'appelant). */
  noRetry?: boolean;
};

export type PoliteFetchResult = {
  ok: boolean;
  status: number;
  text: string;
  url: string;
  /** Vrai si le serveur a renvoyé un code de blocage (403/429/503) → fallback Jina conseillé */
  shouldFallbackJina: boolean;
  /** Nombre de retries effectués */
  retries: number;
  /** UA utilisé (debug) */
  ua: string;
};

/**
 * Exécute une requête HTTP "polie" : UA aléatoire, headers réalistes, throttle
 * par hostname, backoff exponentiel sur 429/503.
 *
 * Renvoie un objet structuré (jamais throw sur erreur HTTP, throw uniquement
 * sur erreur réseau pure ou timeout dépassé).
 */
export async function politeFetch(url: string, opts: PoliteFetchOptions = {}): Promise<PoliteFetchResult> {
  const host = hostnameOf(url);
  const hostDelay = opts.hostDelayMs ?? (opts.polite ? POLITE_HOST_DELAY_MS : DEFAULT_HOST_DELAY_MS);
  const hostConcurrency = opts.hostConcurrency ?? (opts.polite ? 1 : DEFAULT_HOST_CONCURRENCY);
  const timeout = opts.timeoutMs ?? FETCH_TIMEOUT_MS;
  const accept = opts.accept ?? 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';

  await waitForHostSlot(host, hostDelay, hostConcurrency);

  const ua = pickUA();
  const hints = browserHints(ua);

  const baseHeaders: Record<string, string> = {
    'User-Agent': ua,
    Accept: accept,
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Upgrade-Insecure-Requests': '1',
  };
  if (opts.referer) baseHeaders.Referer = opts.referer;
  // Headers Chromium-style sec-ch-* (pour Chrome / Edge uniquement)
  if (hints.chBrand) {
    baseHeaders['sec-ch-ua'] = hints.chBrand;
    baseHeaders['sec-ch-ua-mobile'] = /Mobile|Android|iPhone/.test(ua) ? '?1' : '?0';
    baseHeaders['sec-ch-ua-platform'] =
      /Windows/.test(ua) ? '"Windows"' :
      /Mac/.test(ua) ? '"macOS"' :
      /Linux/.test(ua) ? '"Linux"' :
      /Android/.test(ua) ? '"Android"' : '"Unknown"';
    baseHeaders['Sec-Fetch-Dest'] = 'document';
    baseHeaders['Sec-Fetch-Mode'] = 'navigate';
    baseHeaders['Sec-Fetch-Site'] = opts.referer ? 'same-origin' : 'none';
    baseHeaders['Sec-Fetch-User'] = '?1';
  }

  let retries = 0;
  let lastStatus = 0;
  let lastText = '';

  try {
    while (retries <= MAX_RETRIES) {
      try {
        const r = await fetch(url, {
          headers: baseHeaders,
          cache: 'no-store',
          redirect: 'follow',
          signal: AbortSignal.timeout(timeout),
        });
        lastStatus = r.status;

        // Backoff sur 429 (Too Many Requests), 503 (Service Unavailable)
        // 403 souvent = bot detect → on retry une fois avec un nouveau UA, sinon on lâche
        const shouldRetry = !opts.noRetry && retries < MAX_RETRIES && (
          r.status === 429 || r.status === 503 || (r.status === 403 && retries < 1)
        );

        if (shouldRetry) {
          // Lis Retry-After si fourni
          const retryAfter = r.headers.get('retry-after');
          let waitMs: number;
          if (retryAfter) {
            const seconds = parseFloat(retryAfter);
            waitMs = isNaN(seconds) ? Math.min(60_000, new Date(retryAfter).getTime() - Date.now()) : seconds * 1000;
            if (isNaN(waitMs) || waitMs < 0) waitMs = 2_000;
          } else {
            // Backoff expo : 1s, 2s, 4s, 8s + jitter
            waitMs = Math.pow(2, retries) * 1000 * (0.7 + Math.random() * 0.6);
          }
          waitMs = Math.min(30_000, waitMs);
          await sleep(waitMs);
          retries++;
          continue;
        }

        lastText = await r.text();
        return {
          ok: r.ok,
          status: r.status,
          text: lastText,
          url,
          shouldFallbackJina: r.status === 403 || r.status === 429 || r.status === 503,
          retries,
          ua,
        };
      } catch (e: any) {
        // Erreur réseau / timeout → 1 retry avec autre UA
        if (retries < MAX_RETRIES && !opts.noRetry) {
          await sleep(1500 * (retries + 1));
          retries++;
          continue;
        }
        throw e;
      }
    }
    // Si on sort de la boucle sans return → tous les retries ont échoué
    return {
      ok: false,
      status: lastStatus,
      text: lastText,
      url,
      shouldFallbackJina: lastStatus === 403 || lastStatus === 429 || lastStatus === 503,
      retries,
      ua,
    };
  } finally {
    releaseHostSlot(host);
  }
}

/**
 * Helper pratique : récupère uniquement le texte ou null en cas d'erreur.
 * Compat avec l'ancien fetchText() de site-crawler.
 */
export async function politeFetchText(url: string, opts: PoliteFetchOptions = {}): Promise<string | null> {
  try {
    const r = await politeFetch(url, opts);
    return r.ok ? r.text : null;
  } catch {
    return null;
  }
}

/**
 * Réinitialise les compteurs de throttling (utile pour les tests / restart).
 */
export function resetPoliteFetchState(): void {
  state.lastHit.clear();
  state.inflight.clear();
  state.crawlDelays.clear();
}
