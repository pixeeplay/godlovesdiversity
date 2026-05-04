/**
 * Scraper du feed Facebook events de l'utilisateur connecté.
 *
 * Approche : on utilise les cookies de session FB (c_user, xs, datr, fr) collés par
 * l'utilisateur depuis ses DevTools navigateur, et on fait des requêtes fetch() vers
 * facebook.com en mimant un navigateur. On parse le HTML / JSON intégré pour extraire
 * la liste d'IDs d'events, puis on appelle scrapeUrlMetadata() sur chacun.
 *
 * ⚠ NB :
 * - Cette méthode est techniquement contraire aux ToS Facebook → risque de ban du compte
 * - FB peut casser le scraping à chaque update UI (assez régulier)
 * - On limite la fréquence (max 1 sync par 6h) pour rester discret
 *
 * Usage : cron quotidien ou bouton manuel dans /espace-pro
 */

import { prisma } from './prisma';
import { scrapeUrlMetadata } from './og-scraper';

export type FbFeedSyncResult = {
  ok: boolean;
  fetched: number;
  created: number;
  skipped: number;
  errors: string[];
  eventIds: string[];
};

type FbCookies = { c_user?: string; xs?: string; datr?: string; fr?: string; sb?: string };

function buildCookieHeader(cookies: FbCookies): string {
  return Object.entries(cookies)
    .filter(([_, v]) => !!v)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Scrape la page facebook.com/events (calendar) en utilisant les cookies de session
 * de l'utilisateur. Renvoie les IDs d'events trouvés dans le HTML.
 */
async function fetchUserEventIds(cookies: FbCookies): Promise<string[]> {
  if (!cookies.c_user || !cookies.xs) return [];
  const url = 'https://www.facebook.com/events/calendar';
  try {
    const r = await fetch(url, {
      headers: {
        'Cookie': buildCookieHeader(cookies),
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none'
      },
      redirect: 'manual', // on détecte une redirection vers login
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });

    if (r.status >= 300 && r.status < 400) {
      throw new Error('Facebook redirige (probablement cookies expirés ou invalides)');
    }

    const html = await r.text();
    if (html.includes('login.php') || html.includes('checkpoint')) {
      throw new Error('Facebook demande une re-authentification (cookies expirés ou checkpoint sécurité)');
    }

    // Extrait les event IDs depuis le HTML (multiple patterns selon la version FB)
    const ids = new Set<string>();
    const patterns = [
      /\/events\/(\d{12,18})\//g,                    // pattern URL classique
      /"event_id":"(\d{12,18})"/g,                    // pattern JSON-in-script
      /"id":"(\d{12,18})","__typename":"Event"/g     // pattern GraphQL response
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(html)) !== null) ids.add(m[1]);
    }

    return Array.from(ids);
  } catch (e: any) {
    throw new Error(`Fetch FB feed: ${e?.message}`);
  }
}

/**
 * Synchronise le feed FB events de l'user :
 * 1. Récupère les IDs d'events depuis sa session FB
 * 2. Pour chaque event nouveau, scrape les métadonnées via OG (og-scraper)
 * 3. Crée en BROUILLON (curation manuelle ensuite)
 */
export async function syncFacebookFeed(userId: string): Promise<FbFeedSyncResult> {
  const result: FbFeedSyncResult = { ok: false, fetched: 0, created: 0, skipped: 0, errors: [], eventIds: [] };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fbSessionCookies: true, ownedVenues: { select: { id: true, city: true, name: true } } }
  });
  if (!user?.fbSessionCookies) {
    result.errors.push('Aucune session Facebook configurée. Va dans /espace-pro/facebook-sync pour la coller.');
    return result;
  }

  let cookies: FbCookies;
  try { cookies = JSON.parse(user.fbSessionCookies); }
  catch { result.errors.push('Cookies FB mal formatés (JSON invalide)'); return result; }

  let ids: string[];
  try { ids = await fetchUserEventIds(cookies); }
  catch (e: any) { result.errors.push(e.message); return result; }

  result.fetched = ids.length;
  result.eventIds = ids;

  for (const id of ids) {
    const url = `https://www.facebook.com/events/${id}`;
    try {
      // Idempotence
      const existing = await prisma.event.findFirst({
        where: { externalSource: 'facebook', externalId: id }
      });
      if (existing) { result.skipped++; continue; }

      const meta = await scrapeUrlMetadata(url);
      if (!meta.title || !meta.startsAt) {
        result.skipped++;
        continue;
      }

      // Match avec un venue de l'user via ville/nom
      let venueId: string | null = null;
      if (user.ownedVenues.length > 0 && (meta.location || meta.city)) {
        const v = user.ownedVenues.find(v =>
          (meta.location && v.name?.toLowerCase().includes(meta.location.toLowerCase())) ||
          (meta.city && v.city?.toLowerCase() === meta.city.toLowerCase())
        );
        if (v) venueId = v.id;
      }

      const slug = `fb-feed-${id}-${Date.now().toString(36)}`;
      await prisma.event.create({
        data: {
          slug,
          title: meta.title,
          description: meta.description || null,
          startsAt: new Date(meta.startsAt),
          endsAt: meta.endsAt ? new Date(meta.endsAt) : null,
          location: meta.location || null,
          city: meta.city || null,
          country: meta.country || null,
          coverImage: meta.image || null,
          url,
          tags: ['facebook', 'feed-sync'],
          venueId,
          published: false, // toujours brouillon depuis sync feed
          externalSource: 'facebook',
          externalId: id,
          externalUrl: url
        }
      });
      result.created++;

      // Petite pause pour ne pas pilonner FB
      await new Promise(r => setTimeout(r, 800));
    } catch (e: any) {
      result.errors.push(`${id}: ${e?.message?.slice(0, 80)}`);
      result.skipped++;
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { fbLastSyncedAt: new Date() } }).catch(() => null);

  result.ok = result.created > 0 || result.fetched > 0;
  return result;
}
