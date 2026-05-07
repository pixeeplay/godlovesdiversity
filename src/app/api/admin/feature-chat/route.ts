import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateText } from '@/lib/gemini';
import { bumpQuota, checkQuota } from '@/lib/ai-autopilot';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/feature-chat
 * Body: { idea: string, history?: [{role, content}] }
 *
 * Génère un plan d'implémentation structuré + un prompt prêt à coller dans Claude Cowork.
 * Notifie aussi via Telegram pour ne pas perdre l'idée.
 */

const SYSTEM = `Tu es Architecte Produit pour le projet "parislgbt / francelgbt" (lgbt.pixeeplay.com), une plateforme communautaire LGBTQIA+.

Stack actuel :
- Next.js 14 App Router · TypeScript strict · Prisma 5 sur Postgres
- NextAuth JWT · MinIO S3 · Coolify Docker · Cloudflare CDN
- Gemini 2.0 Flash (text + image), fal.ai, HeyGen, OpenRouter, Ollama Cloud
- 75+ modules existants déjà : forum, lieux 2700+, événements, boutique Stripe, AI Autopilot, manuels auto IA, 4 personas spirituels (Mère Marie, Khadija, Rav Yossef, Maître Tenku), Camino virtuel, Genius textes sacrés, Officiants annuaire, etc.

Quand l'utilisateur propose une idée :
1. Reformule clairement ce qu'il veut (1 phrase)
2. Liste 3-5 modules existants qu'on peut réutiliser
3. Liste les fichiers à créer / modifier (Prisma model, API route, page, component)
4. Estime l'effort en heures (small <2h, medium 2-8h, large >8h)
5. Identifie les risques (sécurité, RGPD, charge IA, complexité)
6. Propose une découpe en 2-3 commits incrémentaux

Réponds en MARKDOWN structuré, sans bla-bla. Tu écris en français.`;

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const idea = String(body.idea || '').trim().slice(0, 4000);
  if (idea.length < 5) return NextResponse.json({ error: 'idea-too-short' }, { status: 400 });

  const history: { role: string; content: string }[] = Array.isArray(body.history) ? body.history.slice(-10) : [];

  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'quota-ai-exhausted' }, { status: 429 });

  const conv = history.map(h => `${h.role === 'user' ? 'User' : 'Architecte'}: ${h.content}`).join('\n\n');
  const fullPrompt = `${SYSTEM}\n\n${conv ? `Conversation précédente:\n${conv}\n\n` : ''}User: ${idea}\n\nArchitecte:`;

  try {
    const r = await generateText(fullPrompt);
    await bumpQuota(1);
    const plan = (r.text || '').trim();

    // Génère aussi un "prompt prêt à coller dans Cowork"
    const coworkPrompt = `Continue le développement de GLD (gld.pixeeplay.com). Voici une nouvelle feature à implémenter :

${idea}

Plan préparé :

${plan}

Implémente cette feature en suivant le plan. Crée les fichiers, push vers main, et confirme quand c'est fini.`;

    // Notification Telegram (best-effort, ne bloque pas)
    notify({
      event: 'admin.alert',
      title: '💡 Nouvelle idée feature notée',
      body: `${idea.slice(0, 200)}${idea.length > 200 ? '…' : ''}\n\n→ Va dans /admin/feature-chat pour récupérer le plan.`,
      url: 'https://gld.pixeeplay.com/admin/feature-chat',
      level: 'info',
      metadata: { idea: idea.slice(0, 500), createdAt: new Date().toISOString() }
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      plan,
      coworkPrompt,
      tokens: plan.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'gemini-error', message: e?.message }, { status: 500 });
  }
}
