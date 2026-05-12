import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET  /api/orgs/[slug]/manuals[?audience=b2b|b2c|internal]  → list manuals
 * POST /api/orgs/[slug]/manuals                              → create manual entry (manuel)
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const url = new URL(req.url);
  const audience = url.searchParams.get('audience');
  const sql = audience
    ? `SELECT * FROM "AiManual" WHERE "audience" = $1 ORDER BY "createdAt" DESC`
    : `SELECT * FROM "AiManual" ORDER BY "createdAt" DESC`;
  const rows: any = audience
    ? await (db as any).$queryRawUnsafe(sql, audience).catch(() => [])
    : await (db as any).$queryRawUnsafe(sql).catch(() => []);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.title || !b.audience || !b.content) return NextResponse.json({ error: 'title/audience/content required' }, { status: 400 });
  const id = randomUUID();
  const baseSlug = (b.slug || b.title).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'manuel';
  const slugVal = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(
    `INSERT INTO "AiManual" ("id","slug","title","audience","tone","language","content","outline","provider","model","tokensUsed","videoScript","tags")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)`,
    id, slugVal, b.title, b.audience, b.tone || null, b.language || 'fr',
    b.content, JSON.stringify(b.outline || []), b.provider || null, b.model || null,
    b.tokensUsed ?? null, b.videoScript || null, Array.isArray(b.tags) ? b.tags : []
  );
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiManual" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0] });
}
