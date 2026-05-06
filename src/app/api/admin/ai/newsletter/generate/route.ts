import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { getAiConfig, isEnabled, AI_KEYS, recordRun, checkQuota, bumpQuota } from '@/lib/ai-autopilot';
import { setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

/**
 * POST /api/admin/ai/newsletter/generate
 * Génère une newsletter draft basée sur l'activité de la semaine.
 * Si autoSend=1, l'envoie immédiatement aux abonnés. Sinon, save en draft.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cfg = await getAiConfig();
  if (!isEnabled(cfg, AI_KEYS.nlEnabled)) {
    return NextResponse.json({ error: 'feature-disabled' }, { status: 400 });
  }
  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'quota-exceeded' }, { status: 429 });

  // Snapshot semaine
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const p = prisma as any;

  const [newUsers, newVenues, newPosts, newTestimonies, upcomingEvents, lastNewsletters] = await Promise.all([
    safeCount(() => p.user?.count?.({ where: { createdAt: { gte: since } } })),
    safeCount(() => p.venue?.count?.({ where: { createdAt: { gte: since } } })),
    safeCount(() => p.forumPost?.count?.({ where: { createdAt: { gte: since } } })),
    safeCount(() => p.videoTestimony?.count?.({ where: { createdAt: { gte: since } } })),
    p.event?.findMany?.({ where: { startsAt: { gte: new Date() }, published: true }, orderBy: { startsAt: 'asc' }, take: 5, select: { title: true, startsAt: true, city: true } }).catch(() => []),
    p.newsletterCampaign?.findMany?.({ where: { sentAt: { not: null } }, orderBy: { sentAt: 'desc' }, take: 3, select: { subject: true } }).catch(() => [])
  ]);

  // Témoignages récents pour citer
  const testimonies = await safeMany(() => p.videoTestimony?.findMany?.({ where: { createdAt: { gte: since }, published: true }, orderBy: { createdAt: 'desc' }, take: 3, select: { title: true, authorName: true } }));

  const tone = cfg[AI_KEYS.nlTone] || 'amical, inclusif, court';
  const weekEnd = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  const prompt = `Tu rédiges une newsletter HEBDO pour God Loves Diversity (réseau social inclusif religieux LGBT+).

Ton : ${tone}.

Activité de la semaine (terminée le ${weekEnd}) :
- ${newUsers} nouveaux membres
- ${newVenues} nouveaux lieux référencés
- ${newPosts} messages dans le forum
- ${newTestimonies} témoignages déposés
${(testimonies as any[]).map(t => `- Témoignage : « ${t.title} » par ${t.authorName || 'anonyme'}`).join('\n')}

Événements à venir :
${(upcomingEvents as any[]).map(e => `- ${e.title} le ${new Date(e.startsAt).toLocaleDateString('fr-FR')} à ${e.city || '?'}`).join('\n')}

Anciens sujets de newsletter (pour ne PAS répéter) :
${(lastNewsletters as any[]).map(n => `- "${n.subject}"`).join('\n')}

Réponds en JSON strict :
{
  "subject": "objet de l'email, 50 chars max, inclut un emoji",
  "preheader": "1 phrase de preview (90 chars max)",
  "html": "corps HTML complet de la newsletter, ~400-600 mots, structure : intro perso → temps fort de la semaine → 3 événements à venir → call-to-action vers le site. Utilise <p>, <h3>, <ul>. Pas de <html><body>, juste le contenu."
}

Règles :
- Pas de blabla "découvrez", "n'hésitez pas"
- Mentionne 1 témoignage par son titre si dispo
- Termine par un CTA clair vers https://gld.pixeeplay.com`;

  const result = await generateText(prompt);
  await bumpQuota(2);

  let parsed: any = {};
  try {
    const cleaned = (result.text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'parse-failed', rawText: result.text?.slice(0, 500) }, { status: 500 });
  }

  // Wrap dans un template HTML simple
  const fullHtml = wrapHtml(parsed.subject || 'GLD Newsletter', parsed.preheader || '', parsed.html || '');

  // Crée le draft NewsletterCampaign
  const draft = await prisma.newsletterCampaign.create({
    data: {
      subject: parsed.subject || `GLD — Semaine du ${weekEnd}`,
      htmlContent: fullHtml,
      textContent: stripHtml(parsed.html || ''),
      status: 'DRAFT'
    }
  });

  await recordRun(AI_KEYS.nlLastRunAt);
  await setSetting(AI_KEYS.nlLastDraftId, draft.id);

  return NextResponse.json({
    ok: true,
    draftId: draft.id,
    subject: draft.subject,
    preheader: parsed.preheader,
    autoSendEnabled: isEnabled(cfg, AI_KEYS.nlAutoSend),
    note: isEnabled(cfg, AI_KEYS.nlAutoSend)
      ? 'autoSend activé : déclenche manuellement /api/admin/newsletter/send avec ce draft'
      : 'Brouillon créé. Va dans /admin/newsletter pour réviser puis envoyer.',
    stats: { newUsers, newVenues, newPosts, newTestimonies, upcomingEvents: (upcomingEvents as any[]).length }
  });
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return (await fn()) || 0; } catch { return 0; }
}
async function safeMany(fn: () => Promise<any[]>): Promise<any[]> {
  try { return (await fn()) || []; } catch { return []; }
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
function wrapHtml(subject: string, preheader: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;background:#f9f9f9;">
<div style="background:white;padding:32px;border-radius:12px;">
<div style="font-size:11px;color:#888;margin-bottom:8px;">${preheader}</div>
<h1 style="font-size:22px;color:#d4537e;margin:0 0 16px;">🌈 God Loves Diversity</h1>
${body}
<hr style="margin:32px 0;border:0;border-top:1px solid #eee;"/>
<p style="font-size:12px;color:#999;text-align:center;">
Tu reçois ce mail car tu es abonné·e à la newsletter GLD.<br/>
<a href="https://gld.pixeeplay.com">gld.pixeeplay.com</a> · <a href="{{unsubscribeUrl}}">Se désabonner</a>
</p>
</div></body></html>`;
}
