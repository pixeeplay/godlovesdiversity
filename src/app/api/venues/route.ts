import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/venues?type=BAR&country=FR&city=Paris&q=keyword
 * Renvoie la liste des venues avec filtres + leurs events à venir.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const type = sp.get('type');
  const country = sp.get('country');
  const city = sp.get('city');
  const q = sp.get('q');
  const featured = sp.get('featured') === '1';

  try {
    const where: any = { published: true };
    if (type) where.type = type;
    if (country) where.country = country;
    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (q) where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } }
    ];
    if (featured) where.featured = true;

    const venues = await prisma.venue.findMany({
      where,
      include: { events: { where: { published: true, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 3 } },
      orderBy: [{ featured: 'desc' }, { rating: 'asc' }, { name: 'asc' }],
      take: 200
    });

    return NextResponse.json({ venues, count: venues.length });
  } catch (e: any) {
    return NextResponse.json({ venues: [], error: e?.message }, { status: 200 });
  }
}
