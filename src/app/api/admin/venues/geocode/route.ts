import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/venues/geocode?limit=50
 * Géocode les venues sans lat/lng via Nominatim (OpenStreetMap, gratuit, 1 req/sec).
 * Limite 50 par appel pour ne pas spammer Nominatim.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '50'), 200);

  const venues = await prisma.venue.findMany({
    where: { lat: null, OR: [{ address: { not: null } }, { city: { not: null } }] },
    take: limit,
    select: { id: true, address: true, city: true, postalCode: true, country: true }
  });

  let geocoded = 0;
  let failed = 0;
  for (const v of venues) {
    const q = [v.address, v.postalCode, v.city, v.country].filter(Boolean).join(', ');
    if (!q) { failed++; continue; }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'GLD/1.0 (https://gld.pixeeplay.com)' }
      });
      const data = await r.json();
      if (data?.[0]?.lat && data[0]?.lon) {
        await prisma.venue.update({
          where: { id: v.id },
          data: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
        });
        geocoded++;
      } else {
        failed++;
      }
      // Rate limit Nominatim : 1 req/sec
      await new Promise(res => setTimeout(res, 1100));
    } catch { failed++; }
  }

  const remaining = await prisma.venue.count({ where: { lat: null } });
  return NextResponse.json({ ok: true, geocoded, failed, processed: venues.length, remaining });
}

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const total = await prisma.venue.count();
  const withCoords = await prisma.venue.count({ where: { lat: { not: null } } });
  const withoutCoords = total - withCoords;
  return NextResponse.json({ total, withCoords, withoutCoords, percentDone: total ? Math.round(withCoords / total * 100) : 0 });
}
