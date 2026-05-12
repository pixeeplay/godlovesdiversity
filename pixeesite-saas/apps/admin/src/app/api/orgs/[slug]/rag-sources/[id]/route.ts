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
  // Toggle active / rename name
  if (typeof b.active === 'boolean') {
    await (db as any).$executeRawUnsafe(
      `UPDATE "RagSource" SET "active"=$1, "updatedAt"=NOW() WHERE "id"=$2`, b.active, id,
    );
  }
  if (typeof b.name === 'string' && b.name) {
    await (db as any).$executeRawUnsafe(
      `UPDATE "RagSource" SET "name"=$1, "updatedAt"=NOW() WHERE "id"=$2`, b.name, id,
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(`DELETE FROM "RagChunk" WHERE "sourceId"=$1`, id);
  await (db as any).$executeRawUnsafe(`DELETE FROM "RagSource" WHERE "id"=$1`, id);
  return NextResponse.json({ ok: true });
}
