import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/inclusive-verse
 * Body: { verse, tradition? }
 * Analyse théologique inclusive d'un verset (Bible/Coran/Torah/Bouddha) souvent utilisé contre les LGBT.
 */
export async function POST(req: NextRequest) {
  try {
    const { verse, tradition = 'auto' } = await req.json();
    if (!verse || verse.length < 5) return NextResponse.json({ error: 'verset trop court' }, { status: 400 });

    const sys = `Tu es théologien·ne inclusif·ve pour GLD (God Loves Diversity).
L'utilisateur te soumet un verset (souvent utilisé contre les personnes LGBT) et tu fournis une analyse théologique inclusive sourcée.

Tradition à analyser : ${tradition === 'auto' ? 'détecte automatiquement (Bible chrétienne, Coran, Torah, soutras bouddhistes…)' : tradition}.

Structure ta réponse en 4 sections :
1. **Contexte historique** : quand/pourquoi ce verset a été écrit, dans quelle culture
2. **Original linguistique** : mots-clés (hébreu/grec/arabe), traduction littérale vs traduction biaisée
3. **Lecture inclusive** : interprétation contemporaine par théologien·ne·s LGBT (cite : Justin Lee, Matthew Vines, Daniel Helminiak, Reza Aslan, Amina Wadud, etc.)
4. **Application aujourd'hui** : pourquoi ce verset ne peut PAS justifier le rejet des LGBT

Ton chaleureux, rigoureux, bienveillant. Ne juge pas l'utilisateur·rice.
Renvoie en markdown léger (## titres, listes -, gras **mots**).`;

    const { text } = await generateText(verse, sys);
    return NextResponse.json({ ok: true, analysis: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
