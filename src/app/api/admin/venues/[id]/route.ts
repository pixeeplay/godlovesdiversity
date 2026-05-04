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
    const allowed: any = {};
    for (const k of ['type','rating','name','description','shortDescription','address','city','postalCode','country','region','lat','lng','phone','email','website','bookingUrl','coverImage','photos','logo','openingHours','tags','instagram','facebook','ownerId','ownerEmail','verified','published','featured']) {
      if (k in body) allowed[k] = body[k];
    }
    const venue = await prisma.venue.update({ where: { id }, data: allowed });
    return NextResponse.json({ venue });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.venue.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
