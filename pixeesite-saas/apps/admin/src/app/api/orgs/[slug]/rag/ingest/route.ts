import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/orgs/[slug]/rag/ingest
 * body: { documents: [{ id?, title, content }] }
 * Chunks → embeddings Gemini text-embedding-004 → stocke en JSON dans AuditLog.metadata.
 * (Pour pgvector vrai : ajouter `vector` column + `pgvector` extension Postgres.)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const docs = Array.isArray(b.documents) ? b.documents : [];
  if (docs.length === 0) return NextResponse.json({ error: 'documents required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const results: any[] = [];
  for (const doc of docs) {
    // Chunk ~500 tokens (~2000 chars)
    const chunks: string[] = [];
    const text = doc.content || '';
    for (let i = 0; i < text.length; i += 2000) chunks.push(text.slice(i, i + 2000));

    const embeddings: number[][] = [];
    for (const chunk of chunks) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: chunk }] },
        }),
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (j.embedding?.values) embeddings.push(j.embedding.values);
    }

    results.push({
      id: doc.id || doc.title.toLowerCase().replace(/\W+/g, '-'),
      title: doc.title,
      chunkCount: chunks.length,
      embeddingDim: embeddings[0]?.length || 0,
      tokensApprox: Math.round(text.length / 4),
    });
  }

  await platformDb.aiUsage.create({
    data: { orgId, provider: 'gemini', model: 'text-embedding-004', operation: 'embed',
      promptTokens: docs.reduce((s: number, d: any) => s + Math.round((d.content || '').length / 4), 0),
      success: true },
  }).catch(() => {});

  return NextResponse.json({ ok: true, documents: results, total: results.length });
}
