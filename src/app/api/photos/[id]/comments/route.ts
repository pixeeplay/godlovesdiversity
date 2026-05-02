import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const items = await prisma.photoComment.findMany({
      where: { photoId: id, approved: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, authorName: true, content: true, createdAt: true }
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const authorName = String(body.authorName || '').trim().slice(0, 60);
  const content = String(body.content || '').trim().slice(0, 1000);
  if (!authorName || !content) {
    return NextResponse.json({ error: 'Nom et message requis' }, { status: 400 });
  }
  // Vérifier que la photo existe
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return NextResponse.json({ error: 'Photo introuvable' }, { status: 404 });

  const created = await prisma.photoComment.create({
    data: {
      photoId: id,
      authorName,
      authorEmail: body.authorEmail ? String(body.authorEmail).trim().slice(0, 200) : null,
      content,
      approved: true
    },
    select: { id: true, authorName: true, content: true, createdAt: true }
  });
  return NextResponse.json(created);
}
