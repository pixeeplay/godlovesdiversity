import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const convs = await prisma.connectConversation.findMany({
    where: { OR: [{ user1Id: u.id }, { user2Id: u.id }] },
    include: {
      user1: { select: { id: true, name: true, image: true, connectProfile: { select: { displayName: true, photos: true, handle: true } } } },
      user2: { select: { id: true, name: true, image: true, connectProfile: { select: { displayName: true, photos: true, handle: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Compte unread par conversation
  const enriched = await Promise.all(convs.map(async (c) => {
    const unread = await prisma.connectMessage.count({
      where: { conversationId: c.id, senderId: { not: u.id }, readAt: null }
    });
    const other = c.user1Id === u.id ? c.user2 : c.user1;
    const last = c.messages[0] || null;
    return { id: c.id, origin: c.origin, other, lastMessage: last, unread, updatedAt: c.updatedAt };
  }));

  return NextResponse.json({ conversations: enriched });
}
