import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);
  const data: any = {};
  for (const k of ['title', 'body', 'pinned', 'locked'] as const) if (b[k] !== undefined) data[k] = b[k];
  const thread = await (db as any).forumThread.update({ where: { id: threadId }, data });
  return NextResponse.json({ ok: true, item: thread });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; threadId: string }> }) {
  const { slug, threadId } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  await (db as any).forumPost.deleteMany({ where: { threadId } });
  await (db as any).forumThread.delete({ where: { id: threadId } });
  return NextResponse.json({ ok: true });
}
