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
  for (const k of ['name', 'image', 'link', 'ctaLabel', 'position', 'active'] as const) if (b[k] !== undefined) data[k] = b[k];
  if (b.priority !== undefined) data.priority = Number(b.priority);
  if (b.startsAt !== undefined) data.startsAt = b.startsAt ? new Date(b.startsAt) : null;
  if (b.endsAt !== undefined) data.endsAt = b.endsAt ? new Date(b.endsAt) : null;
  if (Array.isArray(b.targetPages)) data.targetPages = b.targetPages;
  const item = await (db as any).banner.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).banner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
