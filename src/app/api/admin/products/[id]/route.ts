import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const updated = await prisma.product.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description ?? null,
      priceCents: typeof data.priceCents === 'number' ? Math.round(data.priceCents) : undefined,
      currency: data.currency,
      images: Array.isArray(data.images) ? data.images : undefined,
      stock: data.stock === null ? null : (typeof data.stock === 'number' ? data.stock : undefined),
      category: data.category ?? null,
      variants: data.variants ?? null,
      order: typeof data.order === 'number' ? data.order : undefined,
      published: typeof data.published === 'boolean' ? data.published : undefined,
      // Dropshipping
      dropProvider: data.dropProvider !== undefined ? (data.dropProvider || null) : undefined,
      dropProductId: data.dropProductId !== undefined ? (data.dropProductId || null) : undefined,
      dropVariantMap: data.dropVariantMap !== undefined ? data.dropVariantMap : undefined,
      costCents: data.costCents === null ? null : (typeof data.costCents === 'number' ? Math.round(data.costCents) : undefined)
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
