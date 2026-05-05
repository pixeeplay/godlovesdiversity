import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';
import { moderateText } from '@/lib/connect-moderation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  // Récupère IDs bloqués pour exclure
  const blocked = await prisma.connectBlock.findMany({
    where: { OR: [{ blockerId: u.id }, { blockedId: u.id }] },
    select: { blockerId: true, blockedId: true }
  });
  const blockedIds = new Set([...blocked.map(b => b.blockerId), ...blocked.map(b => b.blockedId)].filter(id => id !== u.id));

  const posts = await prisma.connectPost.findMany({
    where: {
      visibility: 'public',
      moderationStatus: { in: ['approved', 'pending'] },
      authorId: { notIn: Array.from(blockedIds) }
    },
    include: {
      author: { select: { id: true, name: true, image: true, connectProfile: { select: { displayName: true, handle: true, verified: true, identity: true, traditions: true, photos: true, city: true } } } },
      reactions: { select: { type: true, userId: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 })
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, -1) : posts;
  return NextResponse.json({
    posts: items,
    nextCursor: hasMore ? items[items.length - 1].id : null
  });
}

export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });

  const { type = 'post', text, imageUrl, videoUrl, circleSlug, visibility = 'public' } = await req.json();
  if (!text || typeof text !== 'string' || text.length < 2) return NextResponse.json({ error: 'texte requis' }, { status: 400 });
  if (text.length > 5000) return NextResponse.json({ error: 'texte trop long (5000 max)' }, { status: 400 });

  // Modération auto IA
  const mod = await moderateText(text).catch(() => ({ status: 'approved' as const, notes: '' }));
  if (mod.status === 'removed') {
    return NextResponse.json({ error: `Post refusé par la modération : ${mod.notes}` }, { status: 400 });
  }

  const post = await prisma.connectPost.create({
    data: {
      authorId: u.id, type, text, imageUrl, videoUrl, circleSlug, visibility,
      moderationStatus: mod.status, moderationNotes: mod.notes
    }
  });
  return NextResponse.json({ ok: true, post });
}
