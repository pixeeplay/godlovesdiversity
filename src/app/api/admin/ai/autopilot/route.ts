import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAiConfig, AI_KEYS } from '@/lib/ai-autopilot';
import { setSetting } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ai/autopilot — config + stats récentes
 * POST /api/admin/ai/autopilot — body: { [key]: value } pour update
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const config = await getAiConfig();

  // Stats associées
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [modCount, modHidden] = await Promise.all([
    prisma.moderationDecision.count({ where: { createdAt: { gte: since7d } } }).catch(() => 0),
    prisma.moderationDecision.count({ where: { createdAt: { gte: since7d }, action: 'hidden' } }).catch(() => 0)
  ]);

  return NextResponse.json({
    config,
    stats: {
      moderation: { decisionsLast7d: modCount, hiddenLast7d: modHidden },
      quotaUsedToday: parseInt(config[AI_KEYS.quotaUsedToday] || '0'),
      quotaMax: parseInt(config[AI_KEYS.quotaDailyMax] || '500')
    }
  });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const allowedKeys = new Set(Object.values(AI_KEYS));

  let updated = 0;
  for (const [key, val] of Object.entries(body)) {
    if (!allowedKeys.has(key)) continue;
    if (val === null || val === undefined) continue;
    await setSetting(key, String(val));
    updated++;
  }

  return NextResponse.json({ ok: true, updated });
}
