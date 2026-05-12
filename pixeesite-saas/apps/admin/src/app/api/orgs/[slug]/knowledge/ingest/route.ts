import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { embedText, chunkText, fetchUrlContent } from '@/lib/rag';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/orgs/[slug]/knowledge/ingest
 *
 * body : { url?: string, text?: string, title?: string, tags?: string[], author?: string }
 *
 * → Fetch (si url) → chunk → embed (Gemini text-embedding-004 768d) → KnowledgeDoc + chunks
 *
 * Modèle utilisé : KnowledgeDoc + KnowledgeChunk (multi-tenant tables Prisma).
 *
 * Front : KnowledgeAdminClient (onglet "Ajouter").
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  let content = String(b.text || '').trim();
  const url = String(b.url || '').trim();
  const title = String(b.title || '').trim() || 'Document sans titre';

  let sourceType = 'text';
  if (url) {
    try {
      content = await fetchUrlContent(url);
      sourceType = 'url';
    } catch (e: any) {
      return NextResponse.json({ error: `Fetch ${url} : ${e.message}` }, { status: 400 });
    }
  }
  if (!content || content.length < 50) {
    return NextResponse.json({ error: 'text or url required (min 50 chars)' }, { status: 400 });
  }

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const tags: string[] = Array.isArray(b.tags) ? b.tags.slice(0, 8).map((t: any) => String(t)) : [];

  // Crée le doc + chunks dans un transaction-like flow
  const doc = await db.knowledgeDoc.create({
    data: {
      title,
      source: url || null,
      sourceType,
      author: b.author || null,
      content: content.slice(0, 200_000),
      tags,
      enabled: true,
      locale: String(b.locale || 'fr'),
    },
  });

  const pieces = chunkText(content);
  let okChunks = 0;
  let tokensTotal = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    try {
      const embedding = await embedText(geminiKey, piece);
      const tokens = Math.round(piece.length / 4);
      tokensTotal += tokens;
      await db.knowledgeChunk.create({
        data: {
          docId: doc.id,
          position: i,
          text: piece,
          embedding: embedding as any,
          tokens,
        },
      });
      okChunks++;
    } catch (e) {
      console.error(`[knowledge/ingest] chunk ${i} failed`, e);
    }
  }

  return NextResponse.json({
    ok: true,
    docId: doc.id,
    chunkCount: okChunks,
    tokensCount: tokensTotal,
    sourceType,
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const db = await getTenantPrisma(slug);
  const docs = await db.knowledgeDoc.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, title: true, source: true, sourceType: true, author: true,
      tags: true, enabled: true, locale: true, createdAt: true, updatedAt: true,
      _count: { select: { chunks: true } },
    },
  });
  return NextResponse.json({ items: docs });
}
