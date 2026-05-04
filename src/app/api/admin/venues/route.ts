import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const venues = await prisma.venue.findMany({
    include: { events: { where: { startsAt: { gte: new Date() } } }, _count: { select: { coupons: true } } },
    orderBy: { createdAt: 'desc' }
  });
  return NextResponse.json({ venues });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const slug = (body.slug || body.name || '').toString()
      .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `venue-${Date.now().toString(36)}`;

    const venue = await prisma.venue.create({
      data: {
        slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
        type: body.type || 'OTHER',
        rating: body.rating || 'FRIENDLY',
        name: body.name,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        address: body.address || null,
        city: body.city || null,
        postalCode: body.postalCode || null,
        country: body.country || null,
        region: body.region || null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        phone: body.phone || null,
        email: body.email || null,
        website: body.website || null,
        bookingUrl: body.bookingUrl || null,
        coverImage: body.coverImage || null,
        photos: Array.isArray(body.photos) ? body.photos : [],
        logo: body.logo || null,
        openingHours: body.openingHours || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        instagram: body.instagram || null,
        facebook: body.facebook || null,
        ownerId: body.ownerId || null,
        ownerEmail: body.ownerEmail || null,
        verified: !!body.verified,
        published: body.published !== false,
        featured: !!body.featured
      }
    });
    return NextResponse.json({ venue });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
