import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { ingestSource, fetchUrlContent } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** GET → liste les sources RAG du tenant. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const rows = await (db as any).$queryRawUnsafe(
    `SELECT "id", "name", "type", "url", "config", "lastIndexedAt", "chunksCount", "tokensCount", "active", "createdAt", "updatedAt"
     FROM "RagSource" ORDER BY "createdAt" DESC LIMIT 500`,
  ).catch(() => []);
  return NextResponse.json({ items: rows });
}

/**
 * POST → ajoute une source.
 * body: { name, type: 'text'|'url'|'pdf', content?, url?, config? }
 * Si type='url' et pas de content, on fetch le contenu de l'URL.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  if (!b.name || !b.type) return NextResponse.json({ error: 'name et type requis' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée pour cette org' }, { status: 400 });

  let content: string = b.content || '';
  if (!content && b.type === 'url' && b.url) {
    try { content = await fetchUrlContent(b.url); }
    catch (e: any) { return NextResponse.json({ error: `fetch URL: ${e.message}` }, { status: 400 }); }
  }
  if (!content || content.length < 20) return NextResponse.json({ error: 'content vide ou trop court' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  try {
    const result = await ingestSource(db as any, geminiKey, {
      name: b.name, type: b.type, url: b.url || null, content,
      config: b.config || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ingest failed' }, { status: 500 });
  }
}
