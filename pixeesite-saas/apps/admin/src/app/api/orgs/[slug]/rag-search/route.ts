import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { searchTenant } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/rag-search
 * body: { query, topK?, generateAnswer? }
 * Si generateAnswer = true, on appelle aussi Gemini avec les chunks pour produire une réponse.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  const query = String(b.query || '').trim();
  if (!query) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const topK = Math.min(Math.max(Number(b.topK || 5), 1), 20);

  let chunks;
  try { chunks = await searchTenant(db as any, geminiKey, query, topK); }
  catch (e: any) { return NextResponse.json({ error: e?.message || 'search failed' }, { status: 500 }); }

  let answer: string | null = null;
  if (b.generateAnswer && chunks.length > 0) {
    const sources = chunks
      .map((c, i) => `[Source ${i + 1} : ${c.sourceName}${c.sourceUrl ? ` — ${c.sourceUrl}` : ''}]\n${c.text}`)
      .join('\n\n---\n\n');
    const prompt = `Tu es un assistant qui répond strictement à partir des sources fournies. Cite [Source N] quand tu utilises une info.

SOURCES :
${sources}

QUESTION : ${query}

Réponds en français, concis, factuel. Si la réponse n'est pas dans les sources, dis-le clairement.`;
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1500 } }),
        },
      );
      const j = await r.json();
      answer = j?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e: any) {
      answer = `(LLM error: ${e?.message})`;
    }
  }

  return NextResponse.json({
    query,
    chunks: chunks.map((c) => ({
      chunkId: c.chunkId,
      sourceId: c.sourceId,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      text: c.text,
      score: Number(c.score.toFixed(4)),
    })),
    topScore: chunks[0]?.score ? Number(chunks[0].score.toFixed(4)) : 0,
    answer,
  });
}
