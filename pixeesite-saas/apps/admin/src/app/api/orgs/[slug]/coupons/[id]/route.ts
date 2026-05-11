import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const data: any = {};
  for (const k of ['type', 'currency', 'notes', 'active'] as const) if (b[k] !== undefined) data[k] = b[k];
  if (b.value !== undefined) data.value = Number(b.value);
  if (b.minCents !== undefined) data.minCents = b.minCents ? Number(b.minCents) : null;
  if (b.maxUses !== undefined) data.maxUses = b.maxUses ? Number(b.maxUses) : null;
  if (b.validFrom !== undefined) data.validFrom = b.validFrom ? new Date(b.validFrom) : null;
  if (b.validUntil !== undefined) data.validUntil = b.validUntil ? new Date(b.validUntil) : null;
  if (Array.isArray(b.applicableProductIds)) data.applicableProductIds = b.applicableProductIds;
  const item = await (db as any).coupon.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
