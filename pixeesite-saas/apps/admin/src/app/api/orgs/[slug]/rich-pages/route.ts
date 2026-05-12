import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return (s || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';
  const where: any = {};
  if (status) where.status = status;
  const db = await getTenantPrisma(slug);
  const items = await (db as any).richPage?.findMany({
    where, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 100,
  }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const baseSlug = slugify(b.slug || b.title);
  let finalSlug = baseSlug;
  for (let n = 1; n < 20; n++) {
    const exists = await (db as any).richPage.findUnique({ where: { slug: finalSlug } }).catch(() => null);
    if (!exists) break;
    finalSlug = `${baseSlug}-${n + 1}`;
  }
  const item = await (db as any).richPage.create({
    data: {
      slug: finalSlug,
      title: b.title,
      bodyHtml: b.bodyHtml || null,
      meta: b.meta || null,
      status: b.status || 'draft',
      position: typeof b.position === 'number' ? b.position : 0,
      parentId: b.parentId || null,
    },
  });
  return NextResponse.json({ ok: true, item });
}
