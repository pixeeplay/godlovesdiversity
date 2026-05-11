import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/orgs/[slug]/telegram/alerts?limit=80&status=
 * Liste les TelegramAlert (in/out + status).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const url = new URL(req.url);
  const limit = Math.min(200, parseInt(url.searchParams.get('limit') || '80', 10));
  const status = url.searchParams.get('status') || '';

  const db = await getTenantPrisma(slug);
  const where: any = {};
  if (status) where.status = status;

  try {
    const [items, todayCount, totalCount] = await Promise.all([
      (db as any).telegramAlert.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      (db as any).telegramAlert.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      (db as any).telegramAlert.count({}),
    ]);
    return NextResponse.json({ items: items.reverse(), stats: { today: todayCount, total: totalCount } });
  } catch (e: any) {
    return NextResponse.json({ items: [], stats: { today: 0, total: 0 }, error: e?.message });
  }
}

/**
 * POST /api/orgs/[slug]/telegram/alerts
 * Crée un alert manuel (sans envoi). Pour test/log.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  if (!b.chatId || !b.message) return NextResponse.json({ error: 'chatId + message requis' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).telegramAlert.create({
    data: {
      chatId: String(b.chatId),
      message: b.message,
      type: b.type || 'manual',
      parseMode: b.parseMode || null,
      status: b.status || 'pending',
      metadata: b.metadata || null,
    },
  });
  return NextResponse.json({ ok: true, item });
}
