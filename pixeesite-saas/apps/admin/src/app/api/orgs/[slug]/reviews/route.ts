import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'all';
  const productId = url.searchParams.get('productId');
  const db = await getTenantPrisma(slug);
  const where: any = {};
  if (status !== 'all') where.status = status;
  if (productId) where.productId = productId;
  const items = await (db as any).productReview?.findMany?.({ where, orderBy: { createdAt: 'desc' }, take: 200 }).catch(() => []);
  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.productId || !b.rating) return NextResponse.json({ error: 'productId and rating required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const r = await (db as any).productReview?.create?.({
    data: {
      productId: b.productId,
      authorId: b.authorId || null,
      rating: parseInt(String(b.rating), 10),
      title: b.title || null,
      content: b.content || null,
      photos: Array.isArray(b.photos) ? b.photos : [],
      verified: !!b.verified,
      status: b.status || 'pending',
    },
  });
  return NextResponse.json({ ok: true, review: r });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const data: any = {};
  if (b.status) data.status = b.status;
  if (b.content) data.content = b.content;
  if (b.title) data.title = b.title;
  const r = await (db as any).productReview?.update?.({ where: { id: b.id }, data });
  return NextResponse.json({ ok: true, review: r });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await (db as any).productReview?.delete?.({ where: { id } });
  return NextResponse.json({ ok: true });
}
