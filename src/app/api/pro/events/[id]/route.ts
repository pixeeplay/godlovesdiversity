import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function checkOwnership(id: string, userId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id },
    include: { venue: { select: { ownerId: true } } }
  });
  return !!event && event.venue?.ownerId === userId;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  const userId = (s.user as any).id;

  const ok = await checkOwnership(id, userId);
  if (!ok) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });

  try {
    const data = await req.json();
    const allowed: any = {};
    const fields = ['title', 'description', 'location', 'city', 'country', 'address', 'url', 'coverImage', 'published', 'cancelled', 'locale'];
    for (const f of fields) if (data[f] !== undefined) allowed[f] = data[f];
    if (data.startsAt) allowed.startsAt = new Date(data.startsAt);
    if (data.endsAt !== undefined) allowed.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    if (Array.isArray(data.tags)) allowed.tags = data.tags;

    const event = await prisma.event.update({ where: { id }, data: allowed });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const { id } = await params;
  const userId = (s.user as any).id;

  const ok = await checkOwnership(id, userId);
  if (!ok) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });

  try {
    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
