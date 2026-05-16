import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids.filter((x: any) => typeof x === 'string') : [];
  const patch = b.patch && typeof b.patch === 'object' ? b.patch : null;
  if (!ids.length || !patch) return NextResponse.json({ error: 'ids and patch required' }, { status: 400 });

  // Whitelist des champs modifiables en bulk
  const data: any = {};
  if (typeof patch.category === 'string') data.category = patch.category;
  if (typeof patch.active === 'boolean') data.active = patch.active;
  if (typeof patch.currency === 'string') data.currency = patch.currency;

  const db = await getTenantPrisma(slug);
  const r = await db.product.updateMany({ where: { id: { in: ids } }, data });
  return NextResponse.json({ ok: true, updated: r.count });
}
