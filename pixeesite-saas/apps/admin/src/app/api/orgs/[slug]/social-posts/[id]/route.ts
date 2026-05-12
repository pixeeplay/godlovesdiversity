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
  for (const k of ['platform', 'content', 'status'] as const) if (b[k] !== undefined) data[k] = b[k];
  if (Array.isArray(b.mediaUrls)) data.mediaUrls = b.mediaUrls;
  if (Array.isArray(b.hashtags)) data.hashtags = b.hashtags;
  if (b.scheduledAt !== undefined) data.scheduledAt = b.scheduledAt ? new Date(b.scheduledAt) : null;
  const item = await (db as any).socialPost.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).socialPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
