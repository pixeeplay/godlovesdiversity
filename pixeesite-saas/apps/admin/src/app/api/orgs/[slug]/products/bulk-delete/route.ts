import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json().catch(() => ({}));
  const ids = Array.isArray(b.ids) ? b.ids.filter((x: any) => typeof x === 'string') : [];
  if (!ids.length) return NextResponse.json({ error: 'ids required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const r = await db.product.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ ok: true, deleted: r.count });
}
