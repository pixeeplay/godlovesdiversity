import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/translate-live
 * Body: { text, from?, to }
 * Traduction temps réel pour peer-help (rapide, contexte LGBT-friendly).
 */
export async function POST(req: NextRequest) {
  try {
    const { text, from = 'auto', to = 'fr' } = await req.json();
    if (!text) return NextResponse.json({ error: 'text requis' }, { status: 400 });
    const sys = `Tu traduis du ${from} vers le ${to}. Préserve le ton (peut être émotionnel/intime). Utilise vocabulaire inclusif (formules épicènes, point médian si fr). Renvoie UNIQUEMENT la traduction.`;
    const { text: out } = await generateText(text, sys);
    return NextResponse.json({ ok: true, translated: out.trim(), from, to });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
