/**
 * Résout chaque chaîne YouTube vers son live actuel (s'il y en a un).
 * Pas d'API key Google requis : on scrape la page /channel/X/live publique.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36';

export interface ResolvedLive {
  videoId: string | null;
  isLive: boolean;
  title?: string;
  thumbnailUrl?: string;
  resolvedAt: number;
}

/**
 * In-memory cache (TTL 30 min). Se reset à chaque cold-start de l'instance.
 */
const cache = new Map<string, ResolvedLive>();
const TTL_MS = 30 * 60 * 1000;

/**
 * Résout une chaîne YouTube vers son live courant.
 *
 * Stratégie :
 *   GET https://www.youtube.com/channel/<channelId>/live
 *   - Si la chaîne A un live actif, YouTube renvoie la page de la vidéo live.
 *   - On extrait videoId via regex sur les patterns standards YT.
 *   - On vérifie isLive via "isLiveContent":true OU "liveBroadcastDetails".
 *
 * Si la chaîne n'est pas live, YouTube redirige vers la page chaîne sans
 * vidéo en cours → on retourne videoId=null.
 */
export async function resolveChannelLive(channelId: string, opts: { force?: boolean } = {}): Promise<ResolvedLive> {
  if (!opts.force) {
    const hit = cache.get(channelId);
    if (hit && Date.now() - hit.resolvedAt < TTL_MS) return hit;
  }

  const result: ResolvedLive = { videoId: null, isLive: false, resolvedAt: Date.now() };

  try {
    const r = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9',
        'accept': 'text/html,application/xhtml+xml'
      },
      // 8s timeout — si trop lent, on rend un null
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
      cache: 'no-store'
    });

    if (!r.ok) {
      cache.set(channelId, result);
      return result;
    }

    const html = await r.text();

    // 1) Cherche videoId dans canonical link <link rel="canonical" href="...watch?v=ID">
    let videoId: string | null = null;
    const canonical = html.match(/<link\s+rel="canonical"\s+href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})/);
    if (canonical) videoId = canonical[1];

    // 2) Fallback : "videoId":"XXXXXXXXXXX" dans les données JSON inlines
    if (!videoId) {
      const m = html.match(/"videoId":"([\w-]{11})"/);
      if (m) videoId = m[1];
    }

    // 3) Détection isLive : plusieurs marqueurs YouTube
    const isLive =
      /"isLiveContent":true/.test(html) ||
      /"isLive":true/.test(html) ||
      /"liveBroadcastDetails"/.test(html) ||
      /"hlsManifestUrl"/.test(html);

    // 4) Titre (utile pour debug + UI)
    let title: string | undefined;
    const titleMatch =
      html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/) ||
      html.match(/"title":"([^"]+)"/);
    if (titleMatch) title = titleMatch[1].slice(0, 200);

    if (videoId && isLive) {
      result.videoId = videoId;
      result.isLive = true;
      result.title = title;
      result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  } catch {
    // network/timeout → traité comme pas de live
  }

  cache.set(channelId, result);
  return result;
}

/**
 * Vérifie qu'une vidéo YouTube fixe (videoId direct) est encore live.
 * Utilise l'oEmbed public pour juste vérifier qu'elle est accessible (200 OK).
 * Pour vraiment savoir si elle est LIVE en ce moment, on fetch la page watch.
 */
export async function resolveVideoLive(videoId: string, opts: { force?: boolean } = {}): Promise<ResolvedLive> {
  const cacheKey = `video:${videoId}`;
  if (!opts.force) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.resolvedAt < TTL_MS) return hit;
  }

  const result: ResolvedLive = { videoId: null, isLive: false, resolvedAt: Date.now() };

  try {
    const r = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US' },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store'
    });
    if (!r.ok) {
      cache.set(cacheKey, result);
      return result;
    }
    const html = await r.text();
    const isLive =
      /"isLiveContent":true/.test(html) ||
      /"isLive":true/.test(html) ||
      /"hlsManifestUrl"/.test(html);
    const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    if (isLive) {
      result.videoId = videoId;
      result.isLive = true;
      result.title = titleMatch?.[1];
      result.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  } catch {}

  cache.set(cacheKey, result);
  return result;
}

export function clearWebcamCache() {
  cache.clear();
}

export function getCacheStats() {
  return {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([k, v]) => ({
      key: k,
      isLive: v.isLive,
      videoId: v.videoId,
      ageSec: Math.round((Date.now() - v.resolvedAt) / 1000)
    }))
  };
}
