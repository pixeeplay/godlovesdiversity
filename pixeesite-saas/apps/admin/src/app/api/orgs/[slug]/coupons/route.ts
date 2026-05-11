import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).coupon?.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.code) return NextResponse.json({ error: 'code required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).coupon.create({
    data: {
      code: String(b.code).toUpperCase().trim(),
      type: b.type || 'percent',
      value: Number(b.value) || 0,
      currency: b.currency || 'EUR',
      minCents: b.minCents ? Number(b.minCents) : null,
      maxUses: b.maxUses ? Number(b.maxUses) : null,
      validFrom: b.validFrom ? new Date(b.validFrom) : null,
      validUntil: b.validUntil ? new Date(b.validUntil) : null,
      active: b.active !== false,
      applicableProductIds: Array.isArray(b.applicableProductIds) ? b.applicableProductIds : [],
      notes: b.notes || null,
    },
  }).catch((e: any) => ({ __err: e?.message || 'create failed' }));
  if ((item as any).__err) return NextResponse.json({ error: (item as any).__err }, { status: 500 });
  return NextResponse.json({ ok: true, item });
}
