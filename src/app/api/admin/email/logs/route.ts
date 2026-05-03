import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Liste les emails envoyés (50 derniers) avec leur statut.
 * Filtres optionnels : ?status=sent|failed&type=newsletter|test|...&limit=50
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const type = sp.get('type');
  const limit = Math.min(parseInt(sp.get('limit') || '50', 10), 200);

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;

  const [logs, totalCount, sentCount, failedCount, pendingCount] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    }).catch(() => []),
    prisma.emailLog.count().catch(() => 0),
    prisma.emailLog.count({ where: { status: 'sent' } }).catch(() => 0),
    prisma.emailLog.count({ where: { status: 'failed' } }).catch(() => 0),
    prisma.emailLog.count({ where: { status: 'pending' } }).catch(() => 0)
  ]);

  return NextResponse.json({
    logs,
    stats: { total: totalCount, sent: sentCount, failed: failedCount, pending: pendingCount }
  });
}
