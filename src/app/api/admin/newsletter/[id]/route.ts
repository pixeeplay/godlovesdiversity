import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Détail d'une campagne newsletter avec progression en temps réel.
 * GET /api/admin/newsletter/[id] →
 *   { campaign, sentCount, failedCount, pendingCount, recentFailures }
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  const [campaign, logs, sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.newsletterCampaign.findUnique({ where: { id } }),
    prisma.emailLog.findMany({
      where: { campaignId: id, status: 'failed' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { to: true, errorMessage: true, createdAt: true }
    }),
    prisma.emailLog.count({ where: { campaignId: id, status: 'sent' } }),
    prisma.emailLog.count({ where: { campaignId: id, status: 'failed' } }),
    prisma.emailLog.count({ where: { campaignId: id, status: 'pending' } })
  ]);

  if (!campaign) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    campaign,
    progress: { sent: sentCount, failed: failedCount, pending: pendingCount },
    recentFailures: logs
  });
}
