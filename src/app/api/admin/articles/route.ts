import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export async function GET() {
  const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const slug = body.slug || slugify(body.title || 'sans-titre');
  const article = await prisma.article.create({
    data: {
      title: body.title || 'Sans titre',
      slug,
      locale: body.locale || 'fr',
      excerpt: body.excerpt || null,
      content: body.content || { type: 'doc', content: [{ type: 'paragraph' }] },
      coverImage: body.coverImage || null,
      coverVideo: body.coverVideo || null,
      tags: body.tags || [],
      published: !!body.published,
      publishedAt: body.published ? new Date() : null,
      authorId: (s.user as any).id
    }
  });
  return NextResponse.json({ ok: true, article });
}
