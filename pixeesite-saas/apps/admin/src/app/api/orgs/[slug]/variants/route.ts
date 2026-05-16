import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const items = await (db as any).productVariant?.findMany?.({ where: { productId }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }).catch(() => []);
  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.productId || !b.name) return NextResponse.json({ error: 'productId and name required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const v = await (db as any).productVariant?.create?.({
    data: {
      productId: b.productId,
      name: b.name,
      sku: b.sku || null,
      options: b.options || {},
      priceCents: typeof b.priceCents === 'number' ? b.priceCents : null,
      stock: typeof b.stock === 'number' ? b.stock : null,
      images: Array.isArray(b.images) ? b.images : [],
      order: typeof b.order === 'number' ? b.order : 0,
      published: b.published !== false,
    },
  });
  return NextResponse.json({ ok: true, variant: v });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const data: any = {};
  for (const k of ['name', 'sku', 'options', 'priceCents', 'stock', 'images', 'order', 'published']) {
    if (b[k] !== undefined) data[k] = b[k];
  }
  const db = await getTenantPrisma(slug);
  const v = await (db as any).productVariant?.update?.({ where: { id: b.id }, data });
  return NextResponse.json({ ok: true, variant: v });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await (db as any).productVariant?.delete?.({ where: { id } });
  return NextResponse.json({ ok: true });
}
