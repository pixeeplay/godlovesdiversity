/**
 * /api/orgs/[slug]/leads/stats — stats agrégées du CRM (port faithful GLD).
 * Renvoie : total, monthCount, last30Count, sparkline 30j, b2c/b2b vs goals,
 * topSources, topTags, statusMap, avgScore.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const tenantDb = await getTenantPrisma(orgSlug);
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(now.getTime() - 30 * 86400000);

    const [total, monthCount, last30Count, allLeads] = await Promise.all([
      (tenantDb as any).lead.count(),
      (tenantDb as any).lead.count({ where: { createdAt: { gte: monthStart } } }),
      (tenantDb as any).lead.count({ where: { createdAt: { gte: last30 } } }),
      (tenantDb as any).lead.findMany({
        where: { createdAt: { gte: last30 } },
        select: { createdAt: true, tags: true, source: true, status: true, score: true }
      })
    ]);

    const sparkline: number[] = new Array(30).fill(0);
    allLeads.forEach((l: any) => {
      const days = Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / 86400000);
      if (days >= 0 && days < 30) sparkline[29 - days]++;
    });

    const b2cCount = allLeads.filter((l: any) =>
      l.tags?.some((t: string) => t.startsWith('b2c') || t.includes('mariage') || t.includes('couple'))
    ).length;
    const b2bCount = allLeads.filter((l: any) =>
      l.tags?.some((t: string) => t.startsWith('b2b') || t.includes('pro') || t.includes('salon'))
    ).length;

    const sourceMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};
    allLeads.forEach((l: any) => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
      l.tags?.forEach((t: string) => { tagMap[t] = (tagMap[t] || 0) + 1; });
    });
    const topSources = Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

    const statusMap: Record<string, number> = {};
    allLeads.forEach((l: any) => { statusMap[l.status] = (statusMap[l.status] || 0) + 1; });

    const scores = allLeads.map((l: any) => l.score || 0);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

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
