import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { blockedId } = await req.json();
  if (!blockedId || blockedId === u.id) return NextResponse.json({ error: 'invalide' }, { status: 400 });
  await prisma.connectBlock.upsert({
    where: { blockerId_blockedId: { blockerId: u.id, blockedId } },
    update: {},
    create: { blockerId: u.id, blockedId }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { blockedId } = await req.json();
  await prisma.connectBlock.delete({
    where: { blockerId_blockedId: { blockerId: u.id, blockedId } }
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
