/**
 * Reverse geocoding via Nominatim (OpenStreetMap) — gratuit, sans clé.
 * Limites : 1 requête/seconde max, à respecter pour ne pas se faire bannir.
 * Doc : https://nominatim.org/release-docs/latest/api/Reverse/
 */
type GeoResult = {
  city?: string;
  country?: string;
  countryCode?: string;
  placeName?: string;
  raw?: any;
};

const HEADERS = {
  'User-Agent': 'parislgbt/1.0 (https://parislgbt.com)'
};

let lastCall = 0;
async function rateLimit() {
  const now = Date.now();
  const wait = 1100 - (now - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeoResult> {
  await rateLimit();
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr&zoom=18`;
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return {};
    const j = await r.json();
    const a = j.address || {};
    return {
      city: a.city || a.town || a.village || a.hamlet || a.county,
      country: a.country,
      countryCode: a.country_code?.toUpperCase(),
      placeName: j.name || a.amenity || a.place_of_worship,
      raw: j
    };
  } catch {
    return {};
  }
}

/**
 * Détecte le type de lieu de culte d'après les tags OSM
 */
export function detectPlaceType(geo: GeoResult): 'CHURCH' | 'MOSQUE' | 'SYNAGOGUE' | 'TEMPLE' | 'PUBLIC_SPACE' | 'OTHER' | undefined {
  const a = geo.raw?.address || {};
  const t = geo.raw?.type || '';
  const cls = geo.raw?.class || '';

  const religion = (a.religion || '').toLowerCase();
  if (religion === 'christian') return 'CHURCH';
  if (religion === 'muslim') return 'MOSQUE';
  if (religion === 'jewish') return 'SYNAGOGUE';
  if (religion === 'buddhist' || religion === 'hindu') return 'TEMPLE';

  if (a.place_of_worship) {
    const n = a.place_of_worship.toLowerCase();
    if (/(église|church|cathédrale|chapelle)/i.test(n)) return 'CHURCH';
    if (/(mosqu|mosque|masjid)/i.test(n)) return 'MOSQUE';
    if (/(synagogue|temple juif)/i.test(n)) return 'SYNAGOGUE';
    if (/(temple|pagode|stupa)/i.test(n)) return 'TEMPLE';
  }

  if (cls === 'amenity' && t === 'place_of_worship') return 'OTHER';
  return undefined;
}
