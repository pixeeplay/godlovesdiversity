import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const posts = await prisma.forumPost.findMany({
      where: { threadId: id, status: 'active' },
      include: { author: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' }
    });
    await prisma.forumThread.update({ where: { id }, data: { viewsCount: { increment: 1 } } }).catch(() => null);
    return NextResponse.json({ posts });
  } catch (e: any) {
    return NextResponse.json({ posts: [], error: e?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { content, authorId, parentId } = await req.json();
    if (!content) return NextResponse.json({ error: 'content requis' }, { status: 400 });
    const post = await prisma.forumPost.create({ data: { threadId: id, authorId, content, parentId } });
    await prisma.forumThread.update({
      where: { id },
      data: { postsCount: { increment: 1 }, lastReplyAt: new Date() }
    });
    return NextResponse.json({ post });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
