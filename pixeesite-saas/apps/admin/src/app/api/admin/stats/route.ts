import { NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const [users, orgs, sites, subs, paidSubs, invoices, ai30] = await Promise.all([
    platformDb.user.count(),
    platformDb.org.count(),
    platformDb.site.count(),
    platformDb.subscription.count(),
    platformDb.subscription.count({ where: { plan: { not: 'free' } } }),
    platformDb.invoice.aggregate({ _sum: { amountCents: true }, where: { status: 'paid' } }).catch(() => ({ _sum: { amountCents: 0 } })),
    platformDb.aiUsage.aggregate({
      _sum: { costCents: true, promptTokens: true, outputTokens: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) } },
    }).catch(() => ({ _sum: { costCents: 0, promptTokens: 0, outputTokens: 0 } })),
  ]);
  return NextResponse.json({
    users,
    orgs,
    sites,
    subscriptions: subs,
    paidSubscriptions: paidSubs,
    revenueCents: invoices._sum.amountCents || 0,
    aiCostCentsLast30: ai30._sum.costCents || 0,
    aiTokensLast30: (ai30._sum.promptTokens || 0) + (ai30._sum.outputTokens || 0),
  });
}
