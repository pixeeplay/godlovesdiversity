import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).banner?.findMany({ orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).banner.create({
    data: {
      name: b.name,
      image: b.image || null,
      link: b.link || null,
      ctaLabel: b.ctaLabel || null,
      position: b.position || 'hero',
      priority: Number(b.priority) || 0,
      startsAt: b.startsAt ? new Date(b.startsAt) : null,
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      active: b.active !== false,
      targetPages: Array.isArray(b.targetPages) ? b.targetPages : [],
    },
  });
  return NextResponse.json({ ok: true, item });
}
