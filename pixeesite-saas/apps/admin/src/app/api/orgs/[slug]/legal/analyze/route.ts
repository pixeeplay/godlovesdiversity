import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * POST /api/orgs/[slug]/legal/analyze
 * body: { text, kind? }    kind = 'contract'|'cgu'|'cgv'|'rgpd'|'cookies' (optionnel)
 * → analyse via LLM (provider org config) → liste de clauses + risques.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  const text = String(b.text || '').trim();
  if (!text || text.length < 50) return NextResponse.json({ error: 'text requis (min 50 chars)' }, { status: 400 });
  const kind = b.kind || 'contract';

  const sys = `Tu es un juriste français expert en droit du numérique, droit commercial et droit du travail.
Analyse rigoureusement le document fourni. Renvoie STRICTEMENT du JSON valide avec cette structure :
{
  "summary": "résumé en 3 phrases",
  "documentType": "type détecté",
  "parties": ["partie A", "partie B"],
  "clauses": [
    {"title": "intitulé", "summary": "résumé clause", "risk": "low|medium|high", "rationale": "pourquoi ce niveau de risque"}
  ],
  "missingClauses": ["liste de clauses standards manquantes mais recommandées"],
  "gdprIssues": ["problèmes RGPD éventuels"],
  "recommendations": ["recommandations concrètes"]
}
Pas de markdown, pas de \`\`\`, juste le JSON.`;

  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: 'text',
    prompt: `Type attendu : ${kind}\n\nDOCUMENT :\n${text.slice(0, 50000)}\n\nFais l'analyse complète maintenant.`,
    systemPrompt: sys,
    temperature: 0.2,
    maxTokens: 4000,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'analyse failed' }, { status: 500 });

  // Tente de parser du JSON
  let parsed: any = null;
  try {
    const m = result.output.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {}
  return NextResponse.json({ ok: true, raw: result.output, analysis: parsed, provider: result.provider, model: result.model });
}
