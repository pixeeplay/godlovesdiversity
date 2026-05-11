import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return (s || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'theme';
}

/**
 * GET /api/orgs/[slug]/themes
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const db = await getTenantPrisma(slug);
  try {
    const items = await (db as any).theme.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message });
  }
}

/**
 * POST /api/orgs/[slug]/themes
 * Crée un thème custom. Body: { slug?, name, season?, palette, fonts?, blocks?, scheduledFrom?, scheduledUntil?, previewImage? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const b = await req.json();
  if (!b.name) return NextResponse.json({ error: 'name requis' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const baseSlug = slugify(b.slug || b.name);
  let finalSlug = baseSlug;
  for (let n = 1; n < 30; n++) {
    const exists = await (db as any).theme.findUnique({ where: { slug: finalSlug } }).catch(() => null);
    if (!exists) break;
    finalSlug = `${baseSlug}-${n + 1}`;
  }
  const item = await (db as any).theme.create({
    data: {
      slug: finalSlug,
      name: b.name,
      season: b.season || null,
      palette: b.palette || b.colors || { primary: '#d61b80', secondary: '#7c3aed', accent: '#06b6d4', bg: '#0a0a14', fg: '#ffffff' },
      fonts: b.fonts || null,
      blocks: b.blocks || b.decorations || null,
      active: !!b.active,
      scheduledFrom: b.scheduledFrom ? new Date(b.scheduledFrom) : null,
      scheduledUntil: b.scheduledUntil ? new Date(b.scheduledUntil) : null,
      previewImage: b.previewImage || null,
    },
  });
  return NextResponse.json({ ok: true, item });
}
