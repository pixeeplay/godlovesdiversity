import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/orders
 *
 * Query params (tous optionnels) :
 *   - status      : pending|paid|shipped|delivered|refunded|cancelled (csv accepté)
 *   - dateFrom    : ISO date
 *   - dateTo      : ISO date
 *   - search      : recherche dans email/firstName/lastName
 *   - take        : 100 par défaut
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const dateFrom = url.searchParams.get('dateFrom') || '';
  const dateTo = url.searchParams.get('dateTo') || '';
  const search = (url.searchParams.get('search') || '').trim();
  const take = Math.min(parseInt(url.searchParams.get('take') || '100', 10) || 100, 500);

  const where: any = {};
  if (status) {
    const list = status.split(',').map((s) => s.trim()).filter(Boolean);
    if (list.length === 1) where.status = list[0];
    else if (list.length > 1) where.status = { in: list };
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }
  if (search) {
    where.OR = [
      { email:     { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { id:        { contains: search, mode: 'insensitive' } },
    ];
  }

  const db = await getTenantPrisma(slug);
  const items = await db.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take,
  }).catch((e: any) => {
    console.error('[orders.list] db error:', e?.message);
    return [];
  });

  // Stats rapides (sur la même fenêtre filtrée, sans pagination)
  let total = items.length;
  try {
    total = await db.order.count({ where });
  } catch { /* ignore */ }

  return NextResponse.json({ items, total });
}
