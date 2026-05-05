import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';
import { moderateText } from '@/lib/connect-moderation';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ convId: string }> }) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { convId } = await ctx.params;
  const conv = await prisma.connectConversation.findUnique({ where: { id: convId } });
  if (!conv || (conv.user1Id !== u.id && conv.user2Id !== u.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const messages = await prisma.connectMessage.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: 'asc' },
    take: 200
  });

  // Marque tous les messages reçus comme lus
  await prisma.connectMessage.updateMany({
    where: { conversationId: convId, senderId: { not: u.id }, readAt: null },
    data: { readAt: new Date() }
  });

  return NextResponse.json({ conversation: conv, messages });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ convId: string }> }) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { convId } = await ctx.params;
  const conv = await prisma.connectConversation.findUnique({ where: { id: convId } });
  if (!conv || (conv.user1Id !== u.id && conv.user2Id !== u.id)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { text, imageUrl, audioUrl } = await req.json();
  if ((!text || text.trim().length < 1) && !imageUrl && !audioUrl) return NextResponse.json({ error: 'message vide' }, { status: 400 });

  const mod = text ? await moderateText(text).catch(() => ({ status: 'approved' as const, notes: '' })) : { status: 'approved' as const, notes: '' };
  if (mod.status === 'removed') return NextResponse.json({ error: `Message refusé : ${mod.notes}` }, { status: 400 });

  const msg = await prisma.connectMessage.create({
    data: { conversationId: convId, senderId: u.id, text: text || '', imageUrl, audioUrl, moderationStatus: mod.status }
  });
  await prisma.connectConversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ ok: true, message: msg });
}
