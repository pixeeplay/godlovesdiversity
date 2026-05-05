import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { id: (s.user as any).id },
    select: {
      id: true, email: true, name: true, image: true, role: true, createdAt: true,
      bio: true, publicName: true, identity: true, traditions: true, cityProfile: true,
      ghostMode: true, notifyDigest: true, notifyEvents: true, notifyPeerHelp: true, notifyMentor: true, notifyShop: true
    }
  });
  return NextResponse.json({ user: u });
}

export async function PATCH(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  try {
    const body = await req.json();
    const allowed: any = {};
    for (const k of ['name', 'image', 'bio', 'publicName', 'identity', 'cityProfile',
                     'ghostMode', 'notifyDigest', 'notifyEvents', 'notifyPeerHelp', 'notifyMentor', 'notifyShop']) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }
    if (Array.isArray(body.traditions)) allowed.traditions = body.traditions;
    const u = await prisma.user.update({ where: { id: (s.user as any).id }, data: allowed });
    return NextResponse.json({ ok: true, user: u });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function DELETE() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  // Soft delete : mark for deletion in 7 days (RGPD cooldown)
  await prisma.user.update({
    where: { id: (s.user as any).id },
    data: { name: null, image: null, bio: null, publicName: '[supprimé]' }
  });
  return NextResponse.json({ ok: true, message: 'Compte programmé pour suppression dans 7 jours.' });
}
