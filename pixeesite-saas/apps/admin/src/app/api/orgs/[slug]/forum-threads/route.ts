import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'thread';
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const items = await (db as any).forumThread?.findMany({
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    include: { _count: { select: { posts: true } } },
  }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  let s = slugify(b.slug || b.title || 'thread');
  // Unique-ify
  let counter = 1;
  while (await (db as any).forumThread.findUnique({ where: { slug: s } })) {
    s = `${slugify(b.title || 'thread')}-${counter++}`;
  }
  const thread = await (db as any).forumThread.create({
    data: {
      title: b.title || 'Discussion',
      slug: s,
      body: b.body || null,
      authorEmail: auth.user.email,
      authorName: auth.user.name || auth.user.email,
      categoryId: b.categoryId || null,
    },
  });
  return NextResponse.json(thread);
}
