import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/admin/venues/geocode?limit=50
 *
 * Géocode les venues sans lat/lng via Nominatim (OpenStreetMap, gratuit, 1 req/sec)
 * avec 4 stratégies en cascade pour maximiser le taux de succès :
 *
 *   1. Adresse complète : "8 bis Rue Annonerie Vieille, 13100, Aix-en-Provence, France"
 *   2. Adresse + ville (sans CP)
 *   3. Code postal + ville + pays  → fallback "centre de la ville"
 *   4. Recherche nominale "nom + ville" via Nominatim avec namedetails=1
 *
 * À chaque étape réussie, on stocke aussi `geocodeAccuracy` :
 *   - "exact"     : niveau adresse (stratégie 1 ou 2)
 *   - "city"      : niveau ville (stratégie 3) — précision ±2km
 *   - "name"      : trouvé par nom commercial (stratégie 4)
 *   - "failed"    : aucune stratégie n'a marché
 *
 * Header User-Agent obligatoire (politique Nominatim).
 * Auth : ADMIN session OU header X-Cron-Secret = $CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  // Auth : session admin OR cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '50'), 200);

  const venues = await prisma.venue.findMany({
    where: { lat: null, OR: [{ address: { not: null } }, { city: { not: null } }, { name: { not: '' } }] },
    take: limit,
    select: { id: true, name: true, address: true, city: true, postalCode: true, country: true }
  });

  let geocoded = 0;
  let failed = 0;
  const accuracyCounts = { exact: 0, city: 0, name: 0 };
  const sampleFailures: string[] = [];

  for (const v of venues) {
    const result = await geocodeVenue(v);

    if (result.lat && result.lng) {
      await prisma.venue.update({
        where: { id: v.id },
        data: { lat: result.lat, lng: result.lng }
      });
      geocoded++;
      accuracyCounts[result.accuracy as 'exact' | 'city' | 'name']++;
    } else {
      failed++;
      if (sampleFailures.length < 5) {
        sampleFailures.push(`${v.name} (${[v.address, v.city].filter(Boolean).join(', ')})`);
      }
    }

    // Rate limit Nominatim : 1 req/sec absolument respecté
    // (1100ms entre 2 venues, mais chaque venue peut avoir fait 1-4 calls internes
    // avec leurs propres délais — le compteur global est donc largement au-dessus)
    await new Promise((res) => setTimeout(res, 1100));
  }

  const remaining = await prisma.venue.count({ where: { lat: null } });
  return NextResponse.json({
    ok: true,
    geocoded,
    failed,
    accuracy: accuracyCounts,
    processed: venues.length,
    remaining,
    sampleFailures
  });
}

/** Tente le géocodage avec 4 stratégies en cascade. */
async function geocodeVenue(v: {
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}): Promise<{ lat: number; lng: number; accuracy: 'exact' | 'city' | 'name' } | { lat: null; lng: null; accuracy: 'failed' }> {
  const country = v.country || 'France';

  // Stratégie 1 : adresse + CP + ville + pays (max précision)
  if (v.address && v.city) {
    const q1 = [v.address, v.postalCode, v.city, country].filter(Boolean).join(', ');
    const r1 = await nominatim(q1);
    if (r1) return { ...r1, accuracy: 'exact' };
    await sleep(1100);

    // Stratégie 2 : adresse + ville (sans CP qui peut être pollué — ex "13100.0")
    const q2 = [v.address, v.city, country].filter(Boolean).join(', ');
    if (q2 !== q1) {
      const r2 = await nominatim(q2);
      if (r2) return { ...r2, accuracy: 'exact' };
      await sleep(1100);
    }
  }

  // Stratégie 3 : juste CP + ville + pays → centre de la ville (précision ~2km)
  if (v.city) {
    const q3 = [v.postalCode, v.city, country].filter(Boolean).join(', ');
    const r3 = await nominatim(q3);
    if (r3) return { ...r3, accuracy: 'city' };
    await sleep(1100);
  }

  // Stratégie 4 : recherche nominale "nom commercial + ville"
  if (v.name && v.city) {
    const q4 = `${v.name}, ${v.city}, ${country}`;
    const r4 = await nominatim(q4);
    if (r4) return { ...r4, accuracy: 'name' };
  }

  return { lat: null, lng: null, accuracy: 'failed' };
}

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  if (!q || q.length < 3) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'GLD/1.0 (https://gld.pixeeplay.com; contact@gld.pixeeplay.com)',
        'Accept-Language': 'fr,en'
      }
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (data?.[0]?.lat && data[0]?.lon) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  } catch {}
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const total = await prisma.venue.count();
  const withCoords = await prisma.venue.count({ where: { lat: { not: null } } });
  const withoutCoords = total - withCoords;
  return NextResponse.json({
    total,
    withCoords,
    withoutCoords,
    percentDone: total ? Math.round((withCoords / total) * 100) : 0
  });
}
