import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET    /api/orgs/[slug]/manuals/[id]   → fetch single
 * PATCH  /api/orgs/[slug]/manuals/[id]   → update
 * DELETE /api/orgs/[slug]/manuals/[id]   → delete
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiManual" WHERE "id" = $1`, id);
  if (!rows?.[0]) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ item: rows[0] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const sets: string[] = [];
  const values: any[] = [];
  let i = 1;
  if (b.title !== undefined) { sets.push(`"title" = $${i++}`); values.push(b.title); }
  if (b.audience !== undefined) { sets.push(`"audience" = $${i++}`); values.push(b.audience); }
  if (b.tone !== undefined) { sets.push(`"tone" = $${i++}`); values.push(b.tone); }
  if (b.language !== undefined) { sets.push(`"language" = $${i++}`); values.push(b.language); }
  if (b.content !== undefined) { sets.push(`"content" = $${i++}`); values.push(b.content); }
  if (b.outline !== undefined) { sets.push(`"outline" = $${i++}::jsonb`); values.push(JSON.stringify(b.outline)); }
  if (b.videoScript !== undefined) { sets.push(`"videoScript" = $${i++}`); values.push(b.videoScript); }
  if (b.tags !== undefined) { sets.push(`"tags" = $${i++}`); values.push(Array.isArray(b.tags) ? b.tags : []); }
  sets.push(`"updatedAt" = CURRENT_TIMESTAMP`);
  if (sets.length === 1) return NextResponse.json({ ok: true });
  values.push(id);
  await (db as any).$executeRawUnsafe(`UPDATE "AiManual" SET ${sets.join(', ')} WHERE "id" = $${i}`, ...values);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiManual" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(`DELETE FROM "AiManual" WHERE "id" = $1`, id);
  return NextResponse.json({ ok: true });
}
