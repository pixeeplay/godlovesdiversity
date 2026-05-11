/**
 * /api/orgs/[slug]/tasks — gestion tasks (kanban) multi-tenant.
 *
 * GET    : liste filtrable par status
 * POST   : crée une tâche (auto-position en fin de colonne)
 * PATCH  : déplace/maj une tâche (drag&drop : { id, status?, position? })
 * DELETE : supprime via ?id=
 *
 * Schéma Task (Prisma tenant) : id, title, description, status, priority, assignee,
 *   dueDate, tags, position, parentId.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const where: any = status ? { status } : {};

  const tenantDb = await getTenantPrisma(orgSlug);
  const items = await (tenantDb as any).task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { position: 'asc' }]
  }).catch(() => []);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  if (!body.title?.trim()) return NextResponse.json({ error: 'title-required' }, { status: 400 });

  const status = body.status || 'todo';
  const tenantDb = await getTenantPrisma(orgSlug);
  const lastPos = await (tenantDb as any).task.findFirst({
    where: { status }, orderBy: { position: 'desc' }, select: { position: true }
  }).catch(() => null);

  const task = await (tenantDb as any).task.create({
    data: {
      title: String(body.title).trim().slice(0, 300),
      description: body.description?.slice(0, 5000) || null,
      status,
      priority: body.priority || 'normal',
      position: (lastPos?.position || 0) + 1,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      assignee: body.assignee || null,
      parentId: body.parentId || null
    }
  });

  return NextResponse.json({ ok: true, task });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });

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
  const task = await (tenantDb as any).task.update({ where: { id: body.id }, data });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const tenantDb = await getTenantPrisma(orgSlug);
  await (tenantDb as any).task.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
