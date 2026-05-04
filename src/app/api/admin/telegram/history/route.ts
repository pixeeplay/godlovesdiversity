import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/telegram/history?since=ISO&limit=50
 * Renvoie les derniers messages échangés avec le bot.
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const since = searchParams.get('since');
  const limit = Math.min(200, parseInt(searchParams.get('limit') || '50', 10));

  try {
    const messages = await prisma.telegramMessage.findMany({
      where: since ? { createdAt: { gt: new Date(since) } } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Compteurs rapides
    const [todayIn, todayOut, totalIn, totalOut] = await Promise.all([
      prisma.telegramMessage.count({ where: { direction: 'in', createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.telegramMessage.count({ where: { direction: 'out', createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.telegramMessage.count({ where: { direction: 'in' } }),
      prisma.telegramMessage.count({ where: { direction: 'out' } })
    ]);

    return NextResponse.json({
      messages: messages.reverse(), // ordre chrono ascendant pour l'UI
      stats: { todayIn, todayOut, totalIn, totalOut }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
