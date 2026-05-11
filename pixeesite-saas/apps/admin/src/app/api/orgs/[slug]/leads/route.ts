import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await db.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }).catch(() => []);
  const items2 = items.map((l: any) => ({ ...l, title: l.email || l.firstName || l.phone || 'Lead' }));
  return NextResponse.json({ items: items2 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  try {
    const lead = await db.lead.create({
      data: {
        email: b.email || null,
        firstName: b.firstName || null,
        lastName: b.lastName || null,
        phone: b.phone || null,
        company: b.company || null,
        notes: b.notes || null,
        source: b.source || 'manual',
      },
    });
    return NextResponse.json({ ok: true, item: lead });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
