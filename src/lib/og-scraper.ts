/**
 * Scraper OpenGraph + JSON-LD pour extraire les méta-données d'une URL.
 * Utilisé pour importer un event Facebook (ou tout site avec OG tags) en draft GLD.
 *
 * Cette approche fonctionne sans API Facebook : on récupère le HTML de la page event,
 * et on parse les balises <meta property="og:..."> + <script type="application/ld+json">.
 */

export type ScrapedEvent = {
  title?: string;
  description?: string;
  image?: string;
  url: string;
  startsAt?: string;       // ISO string
  endsAt?: string;
  location?: string;
  city?: string;
  country?: string;
  rawJsonLd?: any;
  detectedSource: 'facebook' | 'eventbrite' | 'meetup' | 'web';
};

export async function scrapeUrlMetadata(url: string): Promise<ScrapedEvent> {
  // Normalise l'URL Facebook (mobile → desktop, supprime params trackers)
  let target = url.trim();
  if (target.startsWith('m.facebook.com')) target = 'https://www.' + target.slice(2);
  if (!/^https?:\/\//.test(target)) target = 'https://' + target;
  // Supprime ?fbclid=, ?ref=, etc.
  try {
    const u = new URL(target);
    ['fbclid', 'ref', 'rdr'].forEach(p => u.searchParams.delete(p));
    target = u.toString();
  } catch { /* leave as-is */ }

  const detectedSource: ScrapedEvent['detectedSource'] =
    target.includes('facebook.com') ? 'facebook' :
    target.includes('eventbrite.') ? 'eventbrite' :
    target.includes('meetup.com') ? 'meetup' : 'web';

  let html = '';
  try {
    const r = await fetch(target, {
      headers: {
        // Mimer un navigateur pour que FB renvoie les OG tags
        'User-Agent': 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +https://gld.pixeeplay.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8'
      },
      cache: 'no-store',
      // 8s timeout via AbortSignal
      signal: AbortSignal.timeout(8000)
    });
    html = await r.text();
  } catch (e: any) {
    return { url: target, detectedSource };
  }

  const out: ScrapedEvent = { url: target, detectedSource };

  // OpenGraph tags
  const og = (prop: string) => {
    const m = html.match(new RegExp(`<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']+)["']`, 'i'))
            || html.match(new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${prop}["']`, 'i'));
    return m ? decodeHtmlEntities(m[1]) : undefined;
  };

  out.title = og('og:title') || extractTitle(html);
  out.description = og('og:description') || og('description');
  out.image = og('og:image');

  // JSON-LD Event schema (Eventbrite, Meetup, et certaines pages FB)
  const ldMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of ldMatches) {
    const inner = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
    try {
      const data = JSON.parse(inner);
      const arr = Array.isArray(data) ? data : [data];
      for (const node of arr) {
        const type = node['@type'];
        if (type === 'Event' || (Array.isArray(type) && type.includes('Event'))) {
          out.rawJsonLd = node;
          out.title = out.title || node.name;
          out.description = out.description || (typeof node.description === 'string' ? node.description : undefined);
          out.startsAt = node.startDate;
          out.endsAt = node.endDate;
          if (node.location) {
            const loc = Array.isArray(node.location) ? node.location[0] : node.location;
            out.location = loc.name;
            if (loc.address) {
              out.city = loc.address.addressLocality;
              out.country = loc.address.addressCountry;
            }
          }
          if (!out.image && node.image) out.image = Array.isArray(node.image) ? node.image[0] : node.image;
          break;
        }
      }
    } catch { /* ignore mal-formed JSON-LD */ }
    if (out.startsAt) break;
  }

  // Heuristique Facebook : extraire start_time depuis le HTML (FB embed)
  if (detectedSource === 'facebook' && !out.startsAt) {
    const m = html.match(/"start_time":"([^"]+)"/);
    if (m) out.startsAt = m[1];
    const me = html.match(/"end_time":"([^"]+)"/);
    if (me) out.endsAt = me[1];
    const ml = html.match(/"location":\s*\{[^}]*"name":"([^"]+)"/);
    if (ml) out.location = ml[1];
  }

  return out;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? decodeHtmlEntities(m[1]).trim() : undefined;
}
