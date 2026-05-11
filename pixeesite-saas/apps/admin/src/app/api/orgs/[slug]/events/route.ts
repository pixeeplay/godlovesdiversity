import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return (s || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || '';
  const search = (url.searchParams.get('search') || '').trim();
  const where: any = {};
  if (category) where.category = category;
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { location: { contains: search, mode: 'insensitive' } },
  ];
  const db = await getTenantPrisma(slug);
  const items = await (db as any).event?.findMany({ where, orderBy: { startsAt: 'asc' }, take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.title || !b.startsAt) return NextResponse.json({ error: 'title & startsAt required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).event.create({
    data: {
      slug: slugify(b.slug || b.title) + '-' + Math.random().toString(36).slice(2, 6),
      title: b.title,
      description: b.description || null,
      startsAt: new Date(b.startsAt),
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      location: b.location || null,
      lat: b.lat ?? null,
      lng: b.lng ?? null,
      coverImage: b.coverImage || null,
      category: b.category || null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      externalUrl: b.externalUrl || null,
      published: b.published !== false,
    },
  });
  return NextResponse.json({ ok: true, item });
}
