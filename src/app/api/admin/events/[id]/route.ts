import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const data: any = {};
    if ('title' in body) data.title = body.title;
    if ('description' in body) data.description = body.description;
    if ('startsAt' in body) data.startsAt = new Date(body.startsAt);
    if ('endsAt' in body) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if ('location' in body) data.location = body.location;
    if ('city' in body) data.city = body.city;
    if ('country' in body) data.country = body.country;
    if ('address' in body) data.address = body.address;
    if ('lat' in body) data.lat = body.lat;
    if ('lng' in body) data.lng = body.lng;
    if ('coverImage' in body) data.coverImage = body.coverImage;
    if ('url' in body) data.url = body.url;
    if ('tags' in body) data.tags = Array.isArray(body.tags) ? body.tags : [];
    if ('published' in body) data.published = !!body.published;
    if ('cancelled' in body) data.cancelled = !!body.cancelled;

    const event = await prisma.event.update({ where: { id }, data });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur update' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur delete' }, { status: 500 });
  }
}
