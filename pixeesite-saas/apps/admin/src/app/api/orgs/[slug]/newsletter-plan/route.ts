import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get('year') || `${new Date().getFullYear()}`, 10);
  const db = await getTenantPrisma(slug);
  const items = await (db as any).newsletterPlan?.findMany({
    where: { year },
    orderBy: { month: 'asc' },
    take: 12,
  }).catch(() => []) ?? [];
  return NextResponse.json({ items, year });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.year || !b.month) return NextResponse.json({ error: 'year & month required' }, { status: 400 });
  if (b.month < 1 || b.month > 12) return NextResponse.json({ error: 'month must be 1..12' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).newsletterPlan.upsert({
    where: { year_month: { year: b.year, month: b.month } },
    create: {
      year: b.year, month: b.month,
      theme: b.theme || null, subject: b.subject || null,
      audiences: Array.isArray(b.audiences) ? b.audiences : [],
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
      notes: b.notes || null,
      status: b.status || 'planned',
    },
    update: {
      theme: b.theme ?? undefined,
      subject: b.subject ?? undefined,
      audiences: Array.isArray(b.audiences) ? b.audiences : undefined,
      scheduledAt: b.scheduledAt !== undefined ? (b.scheduledAt ? new Date(b.scheduledAt) : null) : undefined,
      notes: b.notes ?? undefined,
      status: b.status ?? undefined,
    },
  });
  return NextResponse.json({ ok: true, item });
}
