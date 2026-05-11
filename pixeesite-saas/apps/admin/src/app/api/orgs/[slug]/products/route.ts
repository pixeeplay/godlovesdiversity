import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'product';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await db.product.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  let s = slugify(b.slug || b.name || 'product');
  let counter = 1;
  while (await db.product.findUnique({ where: { slug: s } })) {
    s = `${slugify(b.name || 'product')}-${counter++}`;
  }
  const product = await db.product.create({
    data: {
      slug: s,
      name: b.name || 'Sans nom',
      description: b.description || null,
      priceCents: parseInt(b.priceCents || b.price || 0, 10),
      currency: b.currency || 'EUR',
      images: b.images || [],
      inventory: parseInt(b.inventory || 0, 10),
      category: b.category || null,
      active: b.active !== false,
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await db.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
