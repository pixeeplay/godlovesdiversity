import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const search = url.searchParams.get('q')?.trim() || '';
  const where: any = search ? { OR: [{ slug: { contains: search } }, { name: { contains: search, mode: 'insensitive' } }] } : {};
  const orgs = await platformDb.org.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, slug: true, name: true, plan: true, planStatus: true,
      tenantDbReady: true, defaultDomain: true, primaryColor: true,
      createdAt: true, ownerId: true,
      _count: { select: { sites: true, members: true } },
      owner: { select: { email: true } },
    },
  });
  return NextResponse.json({ orgs });
}

export async function PATCH(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await platformDb.org.update({
    where: { id: b.id },
    data: {
      ...(b.plan && { plan: b.plan }),
      ...(b.planStatus && { planStatus: b.planStatus }),
      ...(b.maxSites !== undefined && { maxSites: parseInt(b.maxSites, 10) }),
      ...(b.maxAiCredits !== undefined && { maxAiCredits: parseInt(b.maxAiCredits, 10) }),
      ...(b.usedAiCredits !== undefined && { usedAiCredits: parseInt(b.usedAiCredits, 10) }),
      ...(b.tenantDbReady !== undefined && { tenantDbReady: !!b.tenantDbReady }),
      ...(b.planStatus && { planStatus: b.planStatus }),
    },
  });
  return NextResponse.json(updated);
}
