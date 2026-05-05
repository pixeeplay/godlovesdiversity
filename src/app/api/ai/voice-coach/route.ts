import { NextRequest, NextResponse } from 'next/server';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/voice-coach
 * Body: { scenario, history, userMessage }
 * Simule une conversation difficile (parents/employeur/...). L'IA joue le rôle "adverse" puis débriefe.
 */
export async function POST(req: NextRequest) {
  try {
    const { scenario = 'parents', history = [], userMessage = '' } = await req.json();

    const SCENARIOS: any = {
      parents: 'Tu joues le rôle d\'un parent surpris/mal à l\'aise quand son enfant lui annonce qu\'il/elle est LGBT. Tu réagis comme un parent réaliste : surprise, peur, parfois rejet, mais reste plausible. L\'utilisateur s\'entraîne à son coming-out.',
      employeur: 'Tu joues un manager hétéro qui demande à un employé pourquoi il a mis une photo avec son·sa partenaire de même genre sur son bureau. Reste pro mais maladroit.',
      religieux: 'Tu joues un·e responsable religieux·se conservateur·rice à qui un fidèle annonce être LGBT et croyant·e. Reste respectueux mais en désaccord initial.',
      ami: 'Tu joues un·e ami·e qui réagit avec maladresse à un coming-out (questions intrusives, blagues malvenues sans haine).',
      ecole: 'Tu joues un·e prof à qui un élève signale du harcèlement LGBTphobe en classe. Reste réaliste : adulte parfois dépassé.'
    };

    const sys = `${SCENARIOS[scenario] || SCENARIOS.parents}
Règles :
- Réponds court (1-3 phrases max).
- N'es PAS méchant·e, sois réaliste.
- Tu peux poser des questions, exprimer surprise/peur/incompréhension.
- Après 8 échanges, tu peux évoluer vers la compréhension.
- Si l'utilisateur dit "STOP" → sors du rôle et débriefe : ce qui était bien dit, ce qui pourrait être amélioré.`;

    const conversationContext = history.map((h: any) => `${h.role === 'user' ? 'Utilisateur' : 'Toi'} : ${h.content}`).join('\n');
    const fullPrompt = `${conversationContext}\nUtilisateur : ${userMessage}\nToi :`;

    const { text } = await generateText(fullPrompt, sys);
    return NextResponse.json({ ok: true, response: text.trim() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
