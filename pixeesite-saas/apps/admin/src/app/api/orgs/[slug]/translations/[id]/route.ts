import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const updates: string[] = [];
  const args: any[] = [];
  if (typeof b.value === 'string') { args.push(b.value); updates.push(`"value"=$${args.length}`); }
  if (typeof b.context === 'string') { args.push(b.context); updates.push(`"context"=$${args.length}`); }
  if (typeof b.approved === 'boolean') { args.push(b.approved); updates.push(`"approved"=$${args.length}`); }
  if (typeof b.translatedBy === 'string') { args.push(b.translatedBy); updates.push(`"translatedBy"=$${args.length}`); }
  if (!updates.length) return NextResponse.json({ ok: true, noop: true });
  args.push(id);
  await (db as any).$executeRawUnsafe(
    `UPDATE "Translation" SET ${updates.join(', ')}, "updatedAt"=NOW() WHERE "id"=$${args.length}`,
    ...args,
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(`DELETE FROM "Translation" WHERE "id"=$1`, id);
  return NextResponse.json({ ok: true });
}
