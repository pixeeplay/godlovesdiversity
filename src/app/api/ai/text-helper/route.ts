import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';
import { checkQuota, bumpQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const PROMPTS: Record<string, string> = {
  fix: 'Corrige UNIQUEMENT les fautes d\'orthographe, accords, ponctuation. Ne change pas le sens. Garde la même langue, le même ton, la même longueur. Renvoie UNIQUEMENT le texte corrigé, sans préambule.',
  rewrite: 'Réécris ce texte pour améliorer style et fluidité, en gardant le sens et la longueur. Renvoie UNIQUEMENT le texte réécrit.',
  shorter: 'Condense ce texte en gardant le message essentiel. Vise environ -40% en longueur. Renvoie UNIQUEMENT le texte condensé.',
  longer: 'Développe ce texte en l\'enrichissant (exemples, nuances, détails). Vise environ +60% en longueur. Renvoie UNIQUEMENT le texte enrichi.',
  inclusive: 'Adapte ce texte au ton inclusif du site GLD (réseau LGBT-friendly religieux) : écriture épicène, formulations non-binaires, respect des identités. Renvoie UNIQUEMENT le texte adapté.',
  punchy: 'Réécris en phrases courtes et percutantes. Verbes d\'action. Pas de fioritures. Renvoie UNIQUEMENT le texte percutant.',
  warm: 'Adoucis le ton, rends-le chaleureux et empathique. Comme un ami qui parle. Renvoie UNIQUEMENT le texte chaleureux.',
  pro: 'Rends le ton professionnel et neutre. Vouvoiement si pertinent. Pas familier. Renvoie UNIQUEMENT le texte pro.'
};

/**
 * POST /api/ai/text-helper
 * Body : { text: string, action: keyof PROMPTS, context?: string }
 * Endpoint accessible aux users connectés (quota global Gemini partagé).
 */
export async function POST(req: NextRequest) {
  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'Quota IA quotidien atteint. Réessaie demain.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || '').slice(0, 4000);
  const action = String(body.action || 'fix');
  const context = String(body.context || '').slice(0, 200);

  if (!text.trim()) return NextResponse.json({ error: 'text-required' }, { status: 400 });
  const instruction = PROMPTS[action];
  if (!instruction) return NextResponse.json({ error: 'unknown-action' }, { status: 400 });

  const prompt = `${instruction}${context ? `\n\nContexte : ${context}` : ''}\n\nTexte original :\n"""\n${text}\n"""\n\nRéponds UNIQUEMENT avec le texte transformé, sans guillemets, sans préambule.`;

  try {
    const r = await generateText(prompt);
    await bumpQuota(1);
    let result = (r.text || '').trim();
    // Retire les guillemets si Gemini en met malgré la consigne
    result = result.replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!result || result === text) {
      return NextResponse.json({ ok: false, error: 'Pas de transformation produite. Réessaie.' });
    }
    return NextResponse.json({ ok: true, result, action });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'gemini-error' }, { status: 500 });
  }
}
