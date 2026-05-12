import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { platformDb } from '@pixeesite/database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * GET /api/orgs/[slug]/journal-ia/cron
 *   ?force=1 → régénère même si entry du jour existe déjà
 *   ?date=YYYY-MM-DD → cible une date précise
 *
 * Cron-triggered : génère 1 SiteJournal entry du jour à partir des stats du tenant
 * (articles publiés, leads, posts, etc.) + Gemini.
 *
 * Auth : soit cron token (header x-cron-token), soit org member.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Auth : cron header OR org membership
  const cronToken = req.headers.get('x-cron-token');
  const expected = process.env.CRON_TOKEN;
  let orgId: string | null = null;

  if (cronToken && expected && cronToken === expected) {
    const org = await platformDb.org.findUnique({ where: { slug }, select: { id: true } });
    if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 });
    orgId = org.id;
  } else {
    try {
      const auth = await requireOrgMember(slug);
      orgId = auth.membership.org.id;
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  }

  const url = req.nextUrl;
  const force = url.searchParams.get('force') === '1';
  const targetDateStr = url.searchParams.get('date');
  const date = targetDateStr ? new Date(targetDateStr) : new Date();
  date.setUTCHours(0, 0, 0, 0);

  const db = await getTenantPrisma(slug);

  // Check si entry du jour existe déjà
  const existing = await db.siteJournal.findUnique({ where: { date } });
  if (existing && !force) {
    return NextResponse.json({ ok: true, skipped: true, entry: existing });
  }

  // Collecte stats du jour (24h glissantes)
  const since = new Date(date.getTime() - 24 * 60 * 60 * 1000);
  const [articleCount, leadCount, postCount, photoCount, eventCount] = await Promise.all([
    db.article.count({ where: { publishedAt: { gte: since, lte: date } } }).catch(() => 0),
    db.lead.count({ where: { createdAt: { gte: since, lte: date } } }).catch(() => 0),
    db.connectPost.count({ where: { createdAt: { gte: since, lte: date } } }).catch(() => 0),
    db.userPhoto.count({ where: { createdAt: { gte: since, lte: date } } }).catch(() => 0),
    db.event.count({ where: { startsAt: { gte: since, lte: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
  ]);

  const stats = { articleCount, leadCount, postCount, photoCount, eventCount, date: date.toISOString() };

  const systemPrompt = `Tu es la "voix éditoriale" d'un site (genre journal de bord d'IA).
- Style poétique mais factuel, ton neutre, jamais religieux.
- Tu observes l'activité du site et tu commentes en 1er personne ("Je remarque que…", "Cette journée…").
- Réponse en JSON STRICT :
  { "mood": "joyful|reflective|energetic|calm|melancholic|curious",
    "moodScore": 0.0-1.0,
    "body": "200-500 mots, paragraphes séparés par \\n\\n",
    "bodyShort": "1 phrase teaser (max 25 mots)" }`;

  const prompt = `Voici les statistiques du tenant pour la journée :
- ${articleCount} article(s) publié(s)
- ${leadCount} nouveau(x) lead(s)
- ${postCount} post(s) communautaire(s)
- ${photoCount} photo(s) UGC
- ${eventCount} événement(s) à venir cette semaine

Écris l'entrée du journal du site pour aujourd'hui (${date.toISOString().slice(0, 10)}).
Ton : observateur bienveillant. Pas de chiffres bruts dans le texte (intègre-les naturellement).`;

  const result = await aiCall({
    orgId, feature: 'text', prompt, systemPrompt,
    temperature: 0.85, maxTokens: 1500,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'gen failed' }, { status: 500 });

  let parsed: any = null;
  try {
    const m = result.output.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {}
  if (!parsed?.body) {
    parsed = {
      mood: 'reflective',
      moodScore: 0.5,
      body: result.output.trim(),
      bodyShort: result.output.slice(0, 200),
    };
  }

  const entry = await db.siteJournal.upsert({
    where: { date },
    update: {
      mood: parsed.mood || 'reflective',
      moodScore: Number(parsed.moodScore) || 0.5,
      body: parsed.body,
      bodyShort: parsed.bodyShort || parsed.body.slice(0, 200),
      stats,
      generatedBy: result.model || 'gemini',
      approved: true,
    },
    create: {
      date,
      mood: parsed.mood || 'reflective',
      moodScore: Number(parsed.moodScore) || 0.5,
      body: parsed.body,
      bodyShort: parsed.bodyShort || parsed.body.slice(0, 200),
      stats,
      generatedBy: result.model || 'gemini',
      approved: true,
    },
  });

  return NextResponse.json({ ok: true, entry, provider: result.provider, model: result.model });
}
