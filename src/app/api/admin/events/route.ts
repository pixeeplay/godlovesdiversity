import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const events = await prisma.event.findMany({
      orderBy: [{ startsAt: 'asc' }],
      take: 200
    });
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const slug = (body.slug || body.title || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || `event-${Date.now()}`;

    const event = await prisma.event.create({
      data: {
        slug: `${slug}-${Date.now().toString(36)}`,
        locale: body.locale || 'fr',
        title: body.title,
        description: body.description || null,
        startsAt: new Date(body.startsAt),
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        location: body.location || null,
        city: body.city || null,
        country: body.country || null,
        address: body.address || null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        coverImage: body.coverImage || null,
        url: body.url || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        published: body.published !== false,
        cancelled: !!body.cancelled
      }
    });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur création' }, { status: 500 });
  }
}
