import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await db.article.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const article = await db.article.create({
    data: {
      slug: (b.slug || b.title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: b.title || 'Untitled',
      excerpt: b.excerpt || null,
      bodyHtml: b.bodyHtml || null,
      coverImage: b.coverImage || null,
      status: b.status || 'draft',
      authorName: b.authorName || null,
      tags: Array.isArray(b.tags) ? b.tags : [],
    },
  });
  return NextResponse.json({ ok: true, item: article });
}
