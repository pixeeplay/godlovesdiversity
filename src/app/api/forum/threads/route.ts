import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('category');
  try {
    const threads = await prisma.forumThread.findMany({
      where: { status: 'active', ...(cat ? { category: { slug: cat } } : {}) },
      include: { category: true, author: { select: { id: true, name: true, image: true } } },
      orderBy: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });
    return NextResponse.json({ threads });
  } catch (e: any) {
    return NextResponse.json({ threads: [], error: e?.message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, content, categoryId, authorId } = await req.json();
    if (!title || !content || !categoryId) {
      return NextResponse.json({ error: 'title, content, categoryId requis' }, { status: 400 });
    }
    const slug = title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + Date.now().toString(36);
    const thread = await prisma.forumThread.create({
      data: { title, slug, categoryId, authorId, lastReplyAt: new Date() }
    });
    await prisma.forumPost.create({ data: { threadId: thread.id, authorId, content } });
    await prisma.forumThread.update({ where: { id: thread.id }, data: { postsCount: 1 } });
    return NextResponse.json({ thread });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
