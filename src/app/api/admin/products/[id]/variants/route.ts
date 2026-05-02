import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const items = await prisma.productVariant.findMany({
    where: { productId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const created = await prisma.productVariant.create({
    data: {
      productId: id,
      name: data.name || 'Variant',
      sku: data.sku || null,
      options: data.options || {},
      priceCents: typeof data.priceCents === 'number' ? Math.round(data.priceCents) : null,
      stock: typeof data.stock === 'number' ? data.stock : null,
      images: Array.isArray(data.images) ? data.images : [],
      order: typeof data.order === 'number' ? data.order : 0,
      published: data.published !== false
    }
  });
  return NextResponse.json(created);
}
