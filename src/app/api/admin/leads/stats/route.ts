import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/leads/stats
 * Renvoie stats agrégées : par tag, source, par mois, par jour (sparkline 30j),
 * total, B2C/B2B (basé sur tags 'b2c-mariage*' / 'b2b-pros-*').
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(now.getTime() - 30 * 86400000);

    const [total, monthCount, last30Count, allLeads] = await Promise.all([
      (prisma as any).lead.count(),
      (prisma as any).lead.count({ where: { createdAt: { gte: monthStart } } }),
      (prisma as any).lead.count({ where: { createdAt: { gte: last30 } } }),
      (prisma as any).lead.findMany({
        where: { createdAt: { gte: last30 } },
        select: { createdAt: true, tags: true, source: true, status: true, score: true }
      })
    ]);

    // Sparkline 30 derniers jours
    const sparkline: number[] = new Array(30).fill(0);
    allLeads.forEach((l: any) => {
      const days = Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / 86400000);
      if (days >= 0 && days < 30) sparkline[29 - days]++;
    });

    // B2C vs B2B (basé sur les tags)
    const b2cCount = allLeads.filter((l: any) =>
      l.tags?.some((t: string) => t.startsWith('b2c') || t.includes('mariage') || t.includes('couple'))
    ).length;
    const b2bCount = allLeads.filter((l: any) =>
      l.tags?.some((t: string) => t.startsWith('b2b') || t.includes('pro') || t.includes('salon'))
    ).length;

    // Top sources
    const sourceMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
      l.tags?.forEach((t: string) => {
        tagMap[t] = (tagMap[t] || 0) + 1;
      });
    });
    const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

    // Status breakdown
    const statusMap: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      statusMap[l.status] = (statusMap[l.status] || 0) + 1;
    });

    // Score moyen
    const scores = allLeads.map((l: any) => l.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    // Goals B2C 600/mois, B2B 400/mois
    const b2cGoal = 600;
    const b2bGoal = 400;

    return NextResponse.json({
      total,
      monthCount,
      last30Count,
      sparkline,
      b2c: { count: b2cCount, goal: b2cGoal, percent: Math.round((b2cCount / b2cGoal) * 100) },
      b2b: { count: b2bCount, goal: b2bGoal, percent: Math.round((b2bCount / b2bGoal) * 100) },
      topSources,
      topTags,
      statusMap,
      avgScore,
      generatedAt: new Date().toISOString()
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'stats-error' }, { status: 500 });
  }
}
