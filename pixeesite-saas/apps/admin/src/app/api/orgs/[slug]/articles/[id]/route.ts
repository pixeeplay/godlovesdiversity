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
  for (const k of ['title', 'excerpt', 'bodyHtml', 'coverImage', 'status'] as const) if (b[k] !== undefined) data[k] = b[k];
  if (Array.isArray(b.tags)) data.tags = b.tags;
  if (b.publishedAt !== undefined) data.publishedAt = b.publishedAt ? new Date(b.publishedAt) : null;
  if (b.status === 'published' && !data.publishedAt) data.publishedAt = new Date();
  const item = await (db as any).article.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
