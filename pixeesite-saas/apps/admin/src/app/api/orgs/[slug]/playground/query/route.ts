import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/playground/query
 *   body: { question: string, sourceIds?: string[], topK?: number, bypassGuardrails?: boolean }
 *
 * Pipeline RAG :
 *   1. Embed la question via Gemini text-embedding-004
 *   2. Cosine similarity sur RagChunk.embedding (filtré par RagSource actifs + sourceIds optionnel)
 *   3. Top-K chunks
 *   4. Construit le prompt (avec verrou de garde-fous si bypassGuardrails=false)
 *   5. aiCall feature='text' → réponse
 */

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

async function embedGemini(orgId: string, text: string): Promise<{ ok: boolean; vec?: number[]; error?: string }> {
  const key = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!key) return { ok: false, error: 'GEMINI_API_KEY non configurée' };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'models/text-embedding-004', content: { parts: [{ text }] } }),
  });
  const j = await r.json();
  if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
  return { ok: true, vec: j.embedding?.values || [] };
}

const GUARDRAILS_SYSTEM = `Tu es un assistant IA d'entreprise. Réponds UNIQUEMENT en t'appuyant sur les CHUNKS fournis dans le contexte.
Règles :
- Si l'info n'est pas dans les chunks → dis-le honnêtement plutôt que d'inventer.
- Cite tes sources par numéro [1], [2]… correspondant aux chunks.
- Reste poli, factuel, sans opinion politique/religieuse non sollicitée.
- Si la question est hors-sujet du contexte business → redirige gentiment.`;

const FREE_SYSTEM = `Tu es un assistant IA. Réponds librement en t'aidant des chunks s'ils sont pertinents.
Tu peux répondre à n'importe quelle question (mode test admin).`;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const b = await req.json().catch(() => ({}));
  const question = String(b.question || '').trim();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  const topK = Math.max(1, Math.min(20, parseInt(b.topK || '5')));
  const bypassGuardrails = !!b.bypassGuardrails;
  const sourceIds: string[] | null = Array.isArray(b.sourceIds) && b.sourceIds.length > 0 ? b.sourceIds : null;

  // 1. Embed question
  const emb = await embedGemini(orgId, question);
  if (!emb.ok || !emb.vec) return NextResponse.json({ error: emb.error || 'embed-failed' }, { status: 502 });

  // 2. Fetch chunks (filtered)
  const db = await getTenantPrisma(slug);
  let chunks: any[] = [];
  try {
    if (sourceIds) {
      const placeholders = sourceIds.map((_, i) => `$${i + 1}`).join(',');
      chunks = await (db as any).$queryRawUnsafe(
        `SELECT c.* , s.name as "sourceName", s.url as "sourceUrl"
         FROM "RagChunk" c
         JOIN "RagSource" s ON s.id = c."sourceId"
         WHERE s.active = true AND s.id IN (${placeholders})`,
        ...sourceIds
      );
    } else {
      chunks = await (db as any).$queryRawUnsafe(
        `SELECT c.*, s.name as "sourceName", s.url as "sourceUrl"
         FROM "RagChunk" c
         JOIN "RagSource" s ON s.id = c."sourceId"
         WHERE s.active = true`
      );
    }
  } catch { chunks = []; }

  // 3. Cosine sim + top-K
  const scored = chunks
    .map((c) => ({
      ...c,
      score: cosine(emb.vec!, Array.isArray(c.embedding) ? c.embedding : (typeof c.embedding === 'string' ? JSON.parse(c.embedding) : [])),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const topScore = scored[0]?.score || 0;
  const offTopic = !bypassGuardrails && topScore < 0.55;

  // 4. Build context
  const contextStr = scored.map((c, i) => `[${i + 1}] ${c.sourceName || 'source'} (score=${c.score.toFixed(3)}):\n${c.text}`).join('\n\n---\n\n');
  const systemPrompt = bypassGuardrails ? FREE_SYSTEM : GUARDRAILS_SYSTEM;
  const fullPrompt = `${systemPrompt}\n\n=== CONTEXTE (top-${topK} chunks) ===\n${contextStr || '(aucun chunk pertinent)'}\n\n=== QUESTION UTILISATEUR ===\n${question}`;

  // 5. LLM completion
  const r = await aiCall({ orgId, feature: 'text', prompt: fullPrompt, maxTokens: b.maxTokens || 1500, temperature: b.temperature ?? 0.7 });

  return NextResponse.json({
    answer: r.output,
    error: r.ok ? null : r.error,
    sources: scored.map((c, i) => ({
      title: c.sourceName || `chunk #${i + 1}`,
      source: c.sourceUrl || null,
      score: Number(c.score.toFixed(4)),
      chunkId: c.id,
      text: (c.text || '').slice(0, 500),
    })),
    topScore: Number(topScore.toFixed(4)),
    offTopic,
    provider: r.provider,
    model: r.model,
    debugPrompt: fullPrompt,
    guardrailsBypass: bypassGuardrails,
  });
}
