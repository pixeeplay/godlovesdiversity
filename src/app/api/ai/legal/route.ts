import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/legal
 * Body: { question, country?, context? }
 *
 * Conseil juridique LGBT+ IA (sourcé). Pas de remplacement avocat — juste orientation.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, country = 'FR', context = '' } = await req.json();
    if (!question || question.length < 5) return NextResponse.json({ error: 'question trop courte' }, { status: 400 });

    const sys = `Tu es un assistant juridique LGBT+ pour le site GLD (God Loves Diversity).
L'utilisateur pose une question sur ses droits ou sa situation. Tu réponds en :
1. Donnant une réponse claire et structurée (max 6 paragraphes courts)
2. Citant les articles de loi ou textes pertinents PAR PAYS (${country})
3. Listant les démarches concrètes possibles
4. Renvoyant systématiquement vers une assoc/avocat compétent

⚠ Tu rappelles TOUJOURS au début et à la fin :
- "Cette réponse n'est PAS un avis juridique. Pour une situation personnelle, consulte un·e avocat·e."
- En France : aide juridictionnelle (gratuite si revenus faibles), Défenseur des Droits gratuit, SOS Homophobie (accompagnement plainte).

Pays : ${country}. Contexte additionnel : ${context}
Sois rigoureux, sourcé, et empathique. Ne fais pas de promesses légales.`;

    const { text } = await generateText(question, sys);
    return NextResponse.json({ ok: true, answer: text });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
