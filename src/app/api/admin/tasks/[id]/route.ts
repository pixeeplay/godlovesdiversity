import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (typeof body.title === 'string') data.title = body.title.slice(0, 300);
  if (typeof body.description === 'string') data.description = body.description.slice(0, 5000);
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.priority === 'string') data.priority = body.priority;
  if (typeof body.position === 'number') data.position = body.position;
  if (Array.isArray(body.tags)) data.tags = body.tags.slice(0, 10);
  if ('assignedTo' in body) data.assignedTo = body.assignedTo || null;
  if ('dueAt' in body) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;
  if ('notes' in body) data.notes = body.notes;
  if (data.status === 'done' && !body.completedAt) data.completedAt = new Date();

  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.task.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
