import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { embedText, cosine } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/knowledge/query
 * body : { question: string, topK?: number, generateAnswer?: boolean }
 *
 * → Embedding question + recherche top-K dans KnowledgeChunk via cosine.
 * Optionnel : generation RAG via Gemini.
 *
 * Log les questions sans réponse dans UnansweredQuery.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const question = String(b.question || '').trim();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  const topK = Math.min(Math.max(Number(b.topK || 5), 1), 20);

  const orgId = auth.membership.org.id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);

  let qVec: number[];
  try {
    qVec = await embedText(geminiKey, question);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'embed failed' }, { status: 500 });
  }

  // Load all chunks (in real prod would use vector index)
  const chunks = await db.knowledgeChunk.findMany({
    where: { doc: { enabled: true } },
    include: { doc: { select: { id: true, title: true, source: true } } },
  });

  if (chunks.length === 0) {
    return NextResponse.json({ answer: null, chunks: [], topScore: 0 });
  }

  const scored = chunks
    .map((c: any) => {
      const emb = Array.isArray(c.embedding) ? c.embedding : [];
      return {
        chunkId: c.id,
        docId: c.docId,
        docTitle: c.doc?.title || '',
        docSource: c.doc?.source || null,
        text: c.text,
        score: cosine(qVec, emb),
      };
    })
    .sort((a: any, z: any) => z.score - a.score)
    .slice(0, topK);

  const topScore = scored[0]?.score || 0;

  // Track unanswered queries if score < 0.5
  if (topScore < 0.5) {
    await db.unansweredQuery.create({
      data: { question: question.slice(0, 4000), locale: 'fr', topScore, status: 'PENDING' },
    }).catch(() => {});
  }

  let answer: string | null = null;
  if (b.generateAnswer && scored.length > 0) {
    const sources = scored
      .map((c, i) => `[Source ${i + 1} : ${c.docTitle}${c.docSource ? ` — ${c.docSource}` : ''}]\n${c.text}`)
      .join('\n\n---\n\n');
    const prompt = `Tu es un assistant qui répond strictement à partir des sources fournies. Cite [Source N] quand tu utilises une info.
Ton : neutre, jamais religieux. Si l'info n'est pas dans les sources, dis-le clairement.

SOURCES :
${sources}

QUESTION : ${question}`;

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
          }),
        },
      );
      const j = await r.json();
      answer = j?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e: any) {
      answer = `(LLM error: ${e?.message})`;
    }
  }

  return NextResponse.json({
    question,
    answer,
    topScore: Number(topScore.toFixed(4)),
    chunks: scored.map((c) => ({
      chunkId: c.chunkId,
      docId: c.docId,
      docTitle: c.docTitle,
      docSource: c.docSource,
      text: c.text,
      score: Number(c.score.toFixed(4)),
    })),
  });
}
