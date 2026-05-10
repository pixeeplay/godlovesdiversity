import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  const role = (s.user as any)?.role;
  if (!['ADMIN', 'EDITOR'].includes(role)) return null;
  return s;
}

/** GET /api/admin/tasks?status=todo — liste les tâches groupées par status */
export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const where = status ? { status } : {};

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } },
      createdBy: { select: { id: true, name: true, email: true } }
    }
  });

  // Groupe par status
  const byStatus: Record<string, any[]> = { todo: [], doing: [], review: [], done: [], archive: [] };
  for (const t of tasks) {
    if (!byStatus[t.status]) byStatus[t.status] = [];
    byStatus[t.status].push(t);
  }

  return NextResponse.json({ ok: true, byStatus, total: tasks.length });
}

/** POST /api/admin/tasks — crée une tâche */
export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  if (!body.title?.trim()) return NextResponse.json({ error: 'title-required' }, { status: 400 });

  const status = body.status || 'todo';
  const lastPos = await prisma.task.findFirst({
    where: { status },
    orderBy: { position: 'desc' },
    select: { position: true }
  });

  const task = await prisma.task.create({
    data: {
      title: body.title.trim().slice(0, 300),
      description: body.description?.slice(0, 5000) || null,
      status,
      priority: body.priority || 'normal',
      position: (lastPos?.position || 0) + 1,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      assignedTo: body.assignedTo || null,
      createdById: (s.user as any)?.id || null,
      resourceType: body.resourceType || null,
      resourceId: body.resourceId || null
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, image: true } }
    }
  });

  return NextResponse.json({ ok: true, task });
}

/** PUT /api/admin/tasks — bulk reorder (drag & drop) */
export async function PUT(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updates: { id: string; status: string; position: number }[] = body.updates || [];
  if (!Array.isArray(updates)) return NextResponse.json({ error: 'updates-array-required' }, { status: 400 });

  await Promise.all(
    updates.map((u) =>
      prisma.task.update({
        where: { id: u.id },
        data: {
          status: u.status,
          position: u.position,
          ...(u.status === 'done' ? { completedAt: new Date() } : {})
        }
      })
    )
  );

  return NextResponse.json({ ok: true, count: updates.length });
}
