import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET    /api/admin/menu-permissions/user?userId=X
 * PUT    /api/admin/menu-permissions/user      body: { userId, hidden[], visible[], notes? }
 * DELETE /api/admin/menu-permissions/user?userId=X
 *
 * Tout est ADMIN-only (gestion des comptes).
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');

  if (userId) {
    const ov = await prisma.userMenuOverride.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true, role: true } } }
    });
    return NextResponse.json({ ok: true, override: ov });
  }

  // Liste tous les overrides existants + les users sélectionnables
  const [overrides, users] = await Promise.all([
    prisma.userMenuOverride.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, email: true, name: true, role: true } } }
    }),
    prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'EDITOR'] } },
      orderBy: { email: 'asc' },
      select: { id: true, email: true, name: true, role: true }
    })
  ]);

  return NextResponse.json({ ok: true, overrides, users });
}

export async function PUT(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { userId } = body;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId-required' }, { status: 400 });
  }

  // Vérifie que le user cible existe
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return NextResponse.json({ error: 'user-not-found' }, { status: 404 });

  const hidden = Array.isArray(body.hidden) ? body.hidden.filter((x: any) => typeof x === 'string').slice(0, 200) : [];
  const visible = Array.isArray(body.visible) ? body.visible.filter((x: any) => typeof x === 'string').slice(0, 200) : [];
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null;
  const updatedBy = (s.user as any)?.email || null;

  const saved = await prisma.userMenuOverride.upsert({
    where: { userId },
    create: { userId, hidden, visible, notes, updatedBy },
    update: { hidden, visible, notes, updatedBy }
  });

  return NextResponse.json({ ok: true, override: saved });
}

export async function DELETE(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId-required' }, { status: 400 });

  await prisma.userMenuOverride.delete({ where: { userId } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
