import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/feature-flags/[id]/toggle
 * Inverse value du flag.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  const current = await (db as any).featureFlag.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'flag not found' }, { status: 404 });
  const item = await (db as any).featureFlag.update({ where: { id }, data: { value: !current.value } });
  return NextResponse.json({ ok: true, item });
}
