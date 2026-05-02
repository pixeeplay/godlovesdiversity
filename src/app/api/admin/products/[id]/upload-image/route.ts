import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer, publicUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Upload une image (multipart) et l'ajoute aux images du produit */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 });

  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image trop lourde (max 8 MB)' }, { status: 413 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Image uniquement' }, { status: 415 });

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeSlug = product.slug.replace(/[^a-z0-9-]/gi, '-').slice(0, 40);
    const key = `products/${safeSlug}-${Date.now()}.${ext}`;
    await uploadBuffer(key, buf, file.type);
    const url = publicUrl(key);

    const updated = await prisma.product.update({
      where: { id },
      data: { images: [...(product.images || []), url] }
    });
    return NextResponse.json({ url, images: updated.images });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** Supprime une image du produit (par index) ou réordonne */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return NextResponse.json({ error: 'not found' }, { status: 404 });

  let images = [...(product.images || [])];
  if (typeof body.removeIndex === 'number') {
    images.splice(body.removeIndex, 1);
  } else if (Array.isArray(body.images)) {
    images = body.images.filter((u: any) => typeof u === 'string');
  }
  const updated = await prisma.product.update({ where: { id }, data: { images } });
  return NextResponse.json({ images: updated.images });
}
