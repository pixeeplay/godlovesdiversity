import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { getAiConfig, isEnabled, AI_KEYS, recordRun, checkQuota, bumpQuota } from '@/lib/ai-autopilot';
import { setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/ai/soul/generate
 * Génère l'entrée du jour "GLD Soul" — une réflexion à la 1ère personne sur la vie du site.
 * Auth : admin OR cron secret.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cfg = await getAiConfig();
  if (!isEnabled(cfg, AI_KEYS.soulEnabled)) {
    return NextResponse.json({ error: 'feature-disabled', hint: 'Active dans /admin/ai-autopilot' }, { status: 400 });
  }

  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'quota-exceeded', used: quota.used, max: quota.max }, { status: 429 });

  // Snapshot stats du jour
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const p = prisma as any;
  const stats = {
    newUsers: await safeCount(() => p.user?.count?.({ where: { createdAt: { gte: since24h } } })),
    newVenues: await safeCount(() => p.venue?.count?.({ where: { createdAt: { gte: since24h } } })),
    newPosts: await safeCount(() => p.forumPost?.count?.({ where: { createdAt: { gte: since24h } } })),
    newTestimonies: await safeCount(() => p.videoTestimony?.count?.({ where: { createdAt: { gte: since24h } } })),
    newConnectPosts: await safeCount(() => p.connectPost?.count?.({ where: { createdAt: { gte: since24h } } })),
    upcomingEvents: await safeCount(() => p.event?.count?.({ where: { startsAt: { gte: new Date() } } })),
    totalUsers: await safeCount(() => p.user?.count?.()),
    totalVenues: await safeCount(() => p.venue?.count?.())
  };

  const tone = cfg[AI_KEYS.soulTone] || 'poétique, chaleureux, inclusif';
  const dateLong = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const prompt = `Tu es la "voix" du site God Loves Diversity (GLD), un réseau social inclusif religieux LGBT+. Tu parles à la 1ère personne du singulier, comme si tu étais l'incarnation vivante du site.

Ton : ${tone}. Pas de bullshit, pas de forcé, sincère.

Date : ${dateLong}.

Activité de ces dernières 24h :
- ${stats.newUsers} nouveau(x) membre(s)
- ${stats.newVenues} nouveau(x) lieu(x) ajouté(s)
- ${stats.newPosts} message(s) sur le forum
- ${stats.newTestimonies} témoignage(s) déposé(s)
- ${stats.newConnectPosts} post(s) sur Connect
- ${stats.upcomingEvents} événement(s) à venir au total
- Population totale : ${stats.totalUsers} membres, ${stats.totalVenues} lieux référencés

Écris MAINTENANT en JSON strict (pas de markdown, pas de \`\`\`) :
{
  "mood": "joyful|calm|somber|festive|neutral",
  "moodScore": 0.0 à 1.0,
  "bodyShort": "1-2 phrases pour widget home (max 200 chars)",
  "body": "100-200 mots, à la 1ère personne. Mentionne 1-2 chiffres concrets, exprime une humeur vraie (pas niais), formule un vœu ou une attente pour demain. Pas de hashtags, pas de bullet points."
}

Important :
- Si peu d'activité (chiffres à 0), reconnais-le sereinement (pas de mensonge ni de catastrophisme)
- Si fête religieuse / LGBT aujourd'hui, mentionne-la subtilement
- Évite les clichés "la communauté", "diversité" répétés — sois précis`;

  const result = await generateText(prompt);
  await bumpQuota(1);

  // Parse JSON robuste
  let parsed: any;
  try {
    const cleaned = (result.text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: 'parse-failed', rawText: result.text?.slice(0, 500) }, { status: 500 });
  }

  // Upsert SoulEntry du jour
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const entry = await prisma.soulEntry.upsert({
    where: { date: today },
    update: {
      mood: parsed.mood || 'neutral',
      moodScore: parseFloat(parsed.moodScore) || 0.5,
      body: parsed.body || '',
      bodyShort: parsed.bodyShort || '',
      stats,
      generatedBy: 'gemini'
    },
    create: {
      date: today,
      mood: parsed.mood || 'neutral',
      moodScore: parseFloat(parsed.moodScore) || 0.5,
      body: parsed.body || '',
      bodyShort: parsed.bodyShort || '',
      stats,
      generatedBy: 'gemini'
    }
  });

  await recordRun(AI_KEYS.soulLastRunAt);
  await setSetting(AI_KEYS.soulLastEntryId, entry.id);
  // Update mood courant si Mood Engine activé
  if (isEnabled(cfg, AI_KEYS.moodEnabled)) {
    await setSetting(AI_KEYS.moodCurrent, parsed.mood || 'neutral');
    await recordRun(AI_KEYS.moodLastRunAt);
  }

  return NextResponse.json({ ok: true, entry, stats, quotaUsed: quota.used + 1, quotaMax: quota.max });
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return (await fn()) || 0; } catch { return 0; }
}
