import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiConfig, isEnabled, AI_KEYS } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/soul?days=1
 * Endpoint PUBLIC : renvoie l'entrée Soul du jour (ou des N derniers jours).
 * Utilisé par le widget home + page /journal.
 */
export async function GET(req: Request) {
  const cfg = await getAiConfig();
  if (!isEnabled(cfg, AI_KEYS.soulEnabled)) {
    return NextResponse.json({ enabled: false });
  }

  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') || '1'), 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const entries = await prisma.soulEntry.findMany({
    where: { date: { gte: since }, approved: true },
    orderBy: { date: 'desc' },
    take: days,
    select: { id: true, date: true, mood: true, moodScore: true, body: true, bodyShort: true }
  }).catch(() => []);

  return NextResponse.json({
    enabled: true,
    showOnHome: isEnabled(cfg, AI_KEYS.soulShowOnHome),
    moodCurrent: cfg[AI_KEYS.moodCurrent] || 'neutral',
    entries
  }, {
    headers: { 'cache-control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=3600' }
  });
}
