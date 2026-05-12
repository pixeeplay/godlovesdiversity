import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET ?namespace=&lang=&q= → liste les traductions
 * Format réponse : { items, namespaces, languages, keys }
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const ns = req.nextUrl.searchParams.get('namespace');
  const lang = req.nextUrl.searchParams.get('lang');
  const q = req.nextUrl.searchParams.get('q');
  let where = '1=1';
  const args: any[] = [];
  if (ns) { args.push(ns); where += ` AND "namespace"=$${args.length}`; }
  if (lang) { args.push(lang); where += ` AND "lang"=$${args.length}`; }
  if (q) { args.push(`%${q}%`); where += ` AND ("key" ILIKE $${args.length} OR "value" ILIKE $${args.length})`; }
  const items = await (db as any).$queryRawUnsafe(
    `SELECT "id", "namespace", "key", "lang", "value", "context", "approved", "translatedBy", "createdAt", "updatedAt"
     FROM "Translation" WHERE ${where} ORDER BY "namespace", "key", "lang" LIMIT 2000`, ...args,
  ).catch(() => []);
  // Aggregates
  const meta = await (db as any).$queryRawUnsafe(
    `SELECT
      ARRAY_AGG(DISTINCT "namespace") as namespaces,
      ARRAY_AGG(DISTINCT "lang") as languages,
      COUNT(DISTINCT "key") as "keyCount",
      COUNT(*) as "total"
     FROM "Translation"`,
  ).catch(() => [{ namespaces: [], languages: [], keyCount: 0, total: 0 }]);
  return NextResponse.json({
    items,
    namespaces: meta?.[0]?.namespaces || [],
    languages: meta?.[0]?.languages || [],
    keyCount: Number(meta?.[0]?.keyCount || 0),
    total: Number(meta?.[0]?.total || 0),
  });
}

/**
 * POST → upsert traduction
 * body: { namespace?, key, lang, value, context?, approved?, translatedBy? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.key || !b.lang || typeof b.value !== 'string') {
    return NextResponse.json({ error: 'key, lang et value requis' }, { status: 400 });
  }
  const db = await getTenantPrisma(slug);
  const ns = b.namespace || 'default';
  // Upsert via SQL : insert ... on conflict
  await (db as any).$executeRawUnsafe(
    `INSERT INTO "Translation" ("id","namespace","key","lang","value","context","approved","translatedBy","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
     ON CONFLICT ("namespace","key","lang") DO UPDATE
     SET "value"=EXCLUDED."value","context"=EXCLUDED."context","approved"=EXCLUDED."approved","translatedBy"=EXCLUDED."translatedBy","updatedAt"=NOW()`,
    randomUUID(), ns, b.key, b.lang, b.value, b.context || null, !!b.approved, b.translatedBy || null,
  );
  return NextResponse.json({ ok: true });
}
