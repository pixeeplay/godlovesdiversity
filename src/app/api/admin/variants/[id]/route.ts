import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const updated = await prisma.productVariant.update({
    where: { id },
    data: {
      name: data.name ?? undefined,
      sku: data.sku ?? undefined,
      options: data.options ?? undefined,
      priceCents: data.priceCents === null ? null : (typeof data.priceCents === 'number' ? Math.round(data.priceCents) : undefined),
      stock: data.stock === null ? null : (typeof data.stock === 'number' ? data.stock : undefined),
      images: Array.isArray(data.images) ? data.images : undefined,
      order: typeof data.order === 'number' ? data.order : undefined,
      published: typeof data.published === 'boolean' ? data.published : undefined
    }
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.productVariant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

/** Upload une image pour ce variant (multipart) */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const variant = await prisma.productVariant.findUnique({ where: { id } });
  if (!variant) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (max 8 MB)' }, { status: 413 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Image uniquement' }, { status: 415 });

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeName = variant.name.replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
    const key = `variants/${safeName}-${Date.now()}.${ext}`;
    await uploadBuffer(key, buf, file.type);
    const url = publicUrl(key);
    const updated = await prisma.productVariant.update({
      where: { id },
      data: { images: [...(variant.images || []), url] }
    });
    return NextResponse.json({ url, images: updated.images });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
