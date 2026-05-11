import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/themes/[id]/activate
 * Active ce thème et désactive les autres.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  await (db as any).theme.updateMany({ where: { id: { not: id }, active: true }, data: { active: false } }).catch(() => {});
  const item = await (db as any).theme.update({ where: { id }, data: { active: true } });
  return NextResponse.json({ ok: true, item });
}
