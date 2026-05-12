import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return (s || 'partner').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'partner';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || '';
  const where: any = {};
  if (category) where.category = category;
  const db = await getTenantPrisma(slug);
  const items = await (db as any).partner?.findMany({
    where, orderBy: [{ featured: 'desc' }, { position: 'asc' }, { createdAt: 'desc' }], take: 200,
  }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const baseSlug = slugify(b.slug || b.name);
  let finalSlug = baseSlug;
  for (let n = 1; n < 20; n++) {
    const exists = await (db as any).partner.findUnique({ where: { slug: finalSlug } }).catch(() => null);
    if (!exists) break;
    finalSlug = `${baseSlug}-${n + 1}`;
  }
  const item = await (db as any).partner.create({
    data: {
      name: b.name,
      slug: finalSlug,
      logoUrl: b.logoUrl || null,
      websiteUrl: b.websiteUrl || null,
      description: b.description || null,
      category: b.category || null,
      featured: !!b.featured,
      position: typeof b.position === 'number' ? b.position : 0,
      contactName: b.contactName || null,
      contactEmail: b.contactEmail || null,
      active: b.active !== false,
    },
  });
  return NextResponse.json({ ok: true, item });
}
