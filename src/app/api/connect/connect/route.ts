import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

/**
 * POST → request connection (mode Pro)
 * PATCH → accept/decline incoming
 * GET → list connections
 */
export async function GET() {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const [outgoing, incoming, accepted] = await Promise.all([
    prisma.connectConnection.findMany({ where: { fromId: u.id, status: 'pending' }, include: { to: { select: { name: true, image: true, connectProfile: true } } } }),
    prisma.connectConnection.findMany({ where: { toId: u.id, status: 'pending' }, include: { from: { select: { name: true, image: true, connectProfile: true } } } }),
    prisma.connectConnection.findMany({ where: { status: 'accepted', OR: [{ fromId: u.id }, { toId: u.id }] }, include: { from: { select: { id: true, name: true, image: true, connectProfile: true } }, to: { select: { id: true, name: true, image: true, connectProfile: true } } } })
  ]);
  return NextResponse.json({ outgoing, incoming, accepted });
}

export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { toUserId, message } = await req.json();
  if (!toUserId || toUserId === u.id) return NextResponse.json({ error: 'invalide' }, { status: 400 });

  const conn = await prisma.connectConnection.upsert({
    where: { fromId_toId: { fromId: u.id, toId: toUserId } },
    update: { message },
    create: { fromId: u.id, toId: toUserId, message }
  });
  return NextResponse.json({ ok: true, connection: conn });
}

export async function PATCH(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { connectionId, action } = await req.json();
  if (!connectionId || !['accept', 'decline'].includes(action)) return NextResponse.json({ error: 'invalide' }, { status: 400 });

  const conn = await prisma.connectConnection.findUnique({ where: { id: connectionId } });
  if (!conn || conn.toId !== u.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const updated = await prisma.connectConnection.update({
    where: { id: connectionId },
    data: { status: action === 'accept' ? 'accepted' : 'declined', acceptedAt: action === 'accept' ? new Date() : undefined }
  });

  if (action === 'accept') {
    const [u1, u2] = [conn.fromId, conn.toId].sort();
    await prisma.connectConversation.upsert({
      where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
      update: {},
      create: { user1Id: u1, user2Id: u2, origin: 'connection' }
    });
  }

  return NextResponse.json({ ok: true, connection: updated });
}
