import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET    /api/orgs/[slug]/coach-ia/[id]  → conversation détail + messages
 * DELETE /api/orgs/[slug]/coach-ia/[id]  → delete
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const userId = (auth.user as any).id;
  const db = await getTenantPrisma(slug);
  const conv = await db.aIConversation.findFirst({
    where: { id, userId },
  });
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    id: conv.id, title: conv.title, tool: conv.tool,
    messages: conv.messages, createdAt: conv.createdAt, updatedAt: conv.updatedAt,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const userId = (auth.user as any).id;
  const db = await getTenantPrisma(slug);
  const conv = await db.aIConversation.findFirst({ where: { id, userId } });
  if (!conv) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await db.aIConversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
