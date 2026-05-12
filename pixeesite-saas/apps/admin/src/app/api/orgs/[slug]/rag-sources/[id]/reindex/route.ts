import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { reindexSource, fetchUrlContent } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/rag-sources/[id]/reindex
 * body: { content? }   — si absent et la source est de type url, on refetch l'url
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const rows = await (db as any).$queryRawUnsafe<any[]>(
    `SELECT "id", "name", "type", "url", "config" FROM "RagSource" WHERE "id"=$1`, id,
  );
  if (!rows.length) return NextResponse.json({ error: 'source not found' }, { status: 404 });
  const src = rows[0];

  let content = '';
  try { content = (await req.json().catch(() => ({})))?.content || ''; } catch {}
  if (!content && src.type === 'url' && src.url) {
    try { content = await fetchUrlContent(src.url); }
    catch (e: any) { return NextResponse.json({ error: `fetch URL: ${e.message}` }, { status: 400 }); }
  }
  if (!content) return NextResponse.json({ error: 'aucun content fourni et type non rééxploitable' }, { status: 400 });

  try {
    const r = await reindexSource(db as any, geminiKey, id, content);
    return NextResponse.json({ ok: true, ...r });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'reindex failed' }, { status: 500 });
  }
}
