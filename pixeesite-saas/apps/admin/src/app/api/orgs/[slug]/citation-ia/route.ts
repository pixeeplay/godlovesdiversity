import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/orgs/[slug]/citation-ia
 * body: { theme?: string, mood?: string, length?: 'short'|'medium'|'long', count?: number }
 * → renvoie { citations: [{ text, author? }, ...] }
 *
 * NEUTRE — pas religieux. Citations inspirantes, philosophiques, motivationnelles.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const theme = String(b.theme || '').trim() || 'inspiration';
  const mood = String(b.mood || 'positive');
  const length = String(b.length || 'short') as 'short' | 'medium' | 'long';
  const count = Math.min(Math.max(Number(b.count || 1), 1), 5);

  const lengthInstr: Record<string, string> = {
    short: 'une phrase courte (max 20 mots)',
    medium: 'deux phrases (30-60 mots)',
    long: 'un court paragraphe (80-150 mots)',
  };

  const systemPrompt = `Tu es un générateur de citations originales et inspirantes en français.
- Ton NEUTRE — jamais religieux, jamais spirituel, jamais théologique.
- Style : moderne, philosophique, motivationnel, parfois poétique.
- Pas de cliché type "carpe diem" ou citations connues.
- Si tu attribues à un auteur fictif, indique-le clairement avec "—".
- Renvoie STRICTEMENT du JSON valide.`;

  const prompt = `Génère ${count} citation(s) ORIGINALE(S) sur le thème "${theme}".
Mood : ${mood}.
Format : ${lengthInstr[length] || lengthInstr.short}.

Renvoie un JSON STRICT, exactement :
{ "citations": [ { "text": "...", "author": "—" }, ... ] }`;

  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: 'text',
    prompt,
    systemPrompt,
    temperature: 0.9,
    maxTokens: 800,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'generation failed' }, { status: 500 });

  let parsed: any = null;
  try {
    const m = result.output.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {}
  if (!parsed?.citations) {
    parsed = { citations: [{ text: result.output.trim(), author: '—' }] };
  }
  return NextResponse.json({ ok: true, citations: parsed.citations, provider: result.provider, model: result.model });
}
