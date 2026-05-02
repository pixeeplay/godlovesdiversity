import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const items = await prisma.product.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return NextResponse.json({ items });
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await req.json();
  if (!data.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  let slug = data.slug ? slugify(data.slug) : slugify(data.title);
  // Unicité
  let i = 1;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slugify(data.title)}-${i++}`;
  }
  const created = await prisma.product.create({
    data: {
      slug,
      title: data.title,
      description: data.description || null,
      priceCents: Math.max(0, Math.round(Number(data.priceCents) || 0)),
      currency: data.currency || 'EUR',
      images: Array.isArray(data.images) ? data.images : [],
      stock: typeof data.stock === 'number' ? data.stock : null,
      category: data.category || null,
      variants: data.variants || null,
      order: typeof data.order === 'number' ? data.order : 0,
      published: data.published !== false
    }
  });
  return NextResponse.json(created);
}
