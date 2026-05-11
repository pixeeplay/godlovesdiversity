import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  const db = await getTenantPrisma(slug);

  // Activer manuellement → désactive les autres
  if (b.active === true) {
    await (db as any).theme.updateMany({ where: { id: { not: id }, active: true }, data: { active: false } }).catch(() => {});
  }

  const data: any = {};
  for (const k of ['name', 'season', 'palette', 'fonts', 'blocks', 'previewImage'] as const) {
    if (b[k] !== undefined) data[k] = b[k];
  }
  // Compat avec composant : "colors" → palette
  if (b.colors !== undefined) data.palette = b.colors;
  if (b.decorations !== undefined) data.blocks = b.decorations;
  if (typeof b.active === 'boolean') data.active = b.active;
  if (b.scheduledFrom !== undefined) data.scheduledFrom = b.scheduledFrom ? new Date(b.scheduledFrom) : null;
  if (b.scheduledUntil !== undefined) data.scheduledUntil = b.scheduledUntil ? new Date(b.scheduledUntil) : null;

  const item = await (db as any).theme.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  await (db as any).theme.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
