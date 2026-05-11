import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  const task = await (tenantDb as any).task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body.title === 'string') data.title = body.title.slice(0, 300);
  if (typeof body.description === 'string') data.description = body.description.slice(0, 5000);
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.priority === 'string') data.priority = body.priority;
  if (typeof body.position === 'number') data.position = body.position;
  if (Array.isArray(body.tags)) data.tags = body.tags.slice(0, 10);
  if ('assignee' in body) data.assignee = body.assignee || null;
  if ('dueDate' in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const tenantDb = await getTenantPrisma(orgSlug);
  const task = await (tenantDb as any).task.update({ where: { id }, data });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug: orgSlug, id } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const tenantDb = await getTenantPrisma(orgSlug);
  await (tenantDb as any).task.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
