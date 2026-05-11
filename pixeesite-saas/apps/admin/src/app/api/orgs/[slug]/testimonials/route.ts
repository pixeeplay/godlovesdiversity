import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).testimonial?.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'desc' }], take: 200 }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.authorName) return NextResponse.json({ error: 'authorName required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).testimonial.create({
    data: {
      authorName: b.authorName,
      authorTitle: b.authorTitle || null,
      authorAvatar: b.authorAvatar || null,
      videoUrl: b.videoUrl || null,
      posterImage: b.posterImage || null,
      quote: b.quote || null,
      rating: b.rating ? Number(b.rating) : null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      featured: !!b.featured,
      published: b.published !== false,
      position: Number(b.position) || 0,
    },
  });
  return NextResponse.json({ ok: true, item });
}
