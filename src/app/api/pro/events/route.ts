import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Helpers : lit l'user + valide qu'il possède le venue */
async function getOwnerOr401() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return { error: NextResponse.json({ error: 'login requis' }, { status: 401 }) };
  return { userId: (s.user as any).id as string };
}

/** GET /api/pro/events — tous les events des venues que l'user possède */
export async function GET() {
  const a = await getOwnerOr401();
  if ('error' in a) return a.error;

  try {
    const venues = await prisma.venue.findMany({
      where: { ownerId: a.userId },
      select: { id: true, name: true, slug: true }
    });
    if (venues.length === 0) return NextResponse.json({ venues: [], events: [] });

    const events = await prisma.event.findMany({
      where: { venueId: { in: venues.map(v => v.id) } },
      orderBy: { startsAt: 'desc' },
      take: 200
    });
    return NextResponse.json({ venues, events });
  } catch (e: any) {
    return NextResponse.json({ venues: [], events: [], error: e?.message });
  }
}

/** POST /api/pro/events — créer un event sur un venue dont je suis owner */
export async function POST(req: NextRequest) {
  const a = await getOwnerOr401();
  if ('error' in a) return a.error;
  try {
    const body = await req.json();
    const { venueId, title, description, startsAt, endsAt, location, city, country, address, url, tags, coverImage, locale } = body;

    if (!venueId || !title || !startsAt) {
      return NextResponse.json({ error: 'venueId + title + startsAt requis' }, { status: 400 });
    }

    // Vérif ownership
    const venue = await prisma.venue.findFirst({
      where: { id: venueId, ownerId: a.userId },
      select: { id: true, city: true, country: true, address: true }
    });
    if (!venue) return NextResponse.json({ error: "ce lieu ne t'appartient pas" }, { status: 403 });

    const slug = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}-${Date.now().toString(36)}`;

    const event = await prisma.event.create({
      data: {
        venueId,
        slug,
        locale: locale || 'fr',
        title,
        description: description || null,
        startsAt: new Date(startsAt),
        endsAt: endsAt ? new Date(endsAt) : null,
        location: location || null,
        city: city || venue.city,
        country: country || venue.country,
        address: address || venue.address,
        url: url || null,
        coverImage: coverImage || null,
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
        published: true
      }
    });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
