import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const post = await (db as any).forumPost.create({
    data: {
      threadId,
      body: b.body,
      authorEmail: auth.user.email,
      authorName: auth.user.name || auth.user.email,
      parentId: b.parentId || null,
    },
  });
  // bump thread updatedAt
  await (db as any).forumThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } }).catch(() => {});
  return NextResponse.json(post);
}
