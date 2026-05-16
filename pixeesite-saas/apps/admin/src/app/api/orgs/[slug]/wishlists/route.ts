import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).wishlist?.findMany?.({ orderBy: { createdAt: 'desc' }, take: 500 }).catch(() => []);
  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.userId || !b.productId) return NextResponse.json({ error: 'userId and productId required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const w = await (db as any).wishlist?.upsert?.({
    where: { userId_productId: { userId: b.userId, productId: b.productId } },
    create: { userId: b.userId, productId: b.productId },
    update: {},
  });
  return NextResponse.json({ ok: true, wishlist: w });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await (db as any).wishlist?.delete?.({ where: { id } });
  return NextResponse.json({ ok: true });
}
