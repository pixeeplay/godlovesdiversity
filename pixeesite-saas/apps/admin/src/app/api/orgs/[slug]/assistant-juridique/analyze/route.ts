import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * POST /api/orgs/[slug]/assistant-juridique/analyze
 *
 * body : {
 *   documentText: string,
 *   type: 'rgpd' | 'cgv' | 'cgu' | 'contract' | 'cookies'
 * }
 *
 * Analyse le document légal via LLM (provider org config).
 * Retourne un JSON structuré : clauses + risques + recommandations.
 *
 * Front : /assistant-juridique
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const text = String(b.documentText || b.text || '').trim();
  if (!text || text.length < 50) {
    return NextResponse.json({ error: 'documentText requis (min 50 chars)' }, { status: 400 });
  }
  const type = String(b.type || b.kind || 'contract');

  const systemPrompt = `Tu es un juriste français expert en droit du numérique, droit commercial et droit du travail.
Analyse RIGOUREUSEMENT le document fourni. Renvoie STRICTEMENT du JSON valide avec cette structure :
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
    prompt: `Type attendu : ${type}\n\nDOCUMENT :\n${text.slice(0, 50000)}\n\nFais l'analyse complète maintenant.`,
    systemPrompt,
    temperature: 0.2,
    maxTokens: 4000,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'analyse failed' }, { status: 500 });
  }

  let parsed: any = null;
  try {
    const m = result.output.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {}
  return NextResponse.json({
    ok: true,
    raw: result.output,
    analysis: parsed,
    provider: result.provider,
    model: result.model,
  });
}
