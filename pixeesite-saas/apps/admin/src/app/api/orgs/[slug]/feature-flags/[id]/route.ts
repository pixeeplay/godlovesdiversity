import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  const data: any = {};
  for (const k of ['displayName', 'description', 'audience', 'conditions'] as const) {
    if (b[k] !== undefined) data[k] = b[k];
  }
  if (typeof b.value === 'boolean') data.value = b.value;
  if (typeof b.rollout === 'number') data.rollout = Math.max(0, Math.min(100, b.rollout));
  const db = await getTenantPrisma(slug);
  const item = await (db as any).featureFlag.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  await (db as any).featureFlag.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
