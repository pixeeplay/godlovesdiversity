import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tierFor(points: number): string {
  if (points >= 5000) return 'platinum';
  if (points >= 2000) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).loyaltyAccount?.findMany?.({ orderBy: { points: 'desc' }, take: 200 }).catch(() => []);
  return NextResponse.json({ items: items || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json().catch(() => ({}));
  if (!b.userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  const delta = parseInt(b.delta || 0, 10);
  const reason = String(b.reason || 'adjustment').slice(0, 100);
  const db = await getTenantPrisma(slug);

  let acc = await (db as any).loyaltyAccount?.findUnique?.({ where: { userId: b.userId } }).catch(() => null);
  if (!acc) {
    acc = await (db as any).loyaltyAccount?.create?.({ data: { userId: b.userId, points: 0, tier: 'bronze' } });
  }
  const newPoints = Math.max(0, acc.points + delta);
  const newTier = tierFor(newPoints);
  await (db as any).loyaltyAccount?.update?.({ where: { id: acc.id }, data: { points: newPoints, tier: newTier } });
  await (db as any).loyaltyLedger?.create?.({ data: { accountId: acc.id, delta, reason, metadata: b.metadata || null } });
  return NextResponse.json({ ok: true, points: newPoints, tier: newTier });
}
