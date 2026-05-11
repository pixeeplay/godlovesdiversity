import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).sitemapEntry?.findMany({ orderBy: [{ position: 'asc' }, { path: 'asc' }] }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const path = (b.path || '/').toString();
  const entry = await (db as any).sitemapEntry.upsert({
    where: { path },
    create: {
      path,
      label: b.label || path,
      parentId: b.parentId || null,
      position: b.position || 0,
      visibleNav: b.visibleNav !== false,
      visibleSEO: b.visibleSEO !== false,
      changefreq: b.changefreq || null,
      priority: b.priority ?? null,
    },
    update: {
      label: b.label,
      parentId: b.parentId || null,
      position: b.position,
      visibleNav: b.visibleNav,
      visibleSEO: b.visibleSEO,
      changefreq: b.changefreq,
      priority: b.priority,
    },
  });
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  await (db as any).sitemapEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
