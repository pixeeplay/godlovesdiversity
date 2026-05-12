import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/orgs/[slug]/rag/sources                → list RagSource
 * POST /api/orgs/[slug]/rag/sources                → create empty source
 */

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "RagSource" ORDER BY "createdAt" DESC`).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name || !b.type) return NextResponse.json({ error: 'name/type required' }, { status: 400 });
  const id = randomUUID();
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(
    `INSERT INTO "RagSource" ("id","name","type","url","config","active") VALUES ($1,$2,$3,$4,$5::jsonb,$6)`,
    id, b.name, b.type, b.url || null, JSON.stringify(b.config || {}), b.active !== false
  );
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "RagSource" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0] });
}
