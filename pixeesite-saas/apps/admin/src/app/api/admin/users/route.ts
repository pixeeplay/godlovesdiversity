import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const search = url.searchParams.get('q')?.trim() || '';
  const where: any = search ? { OR: [{ email: { contains: search, mode: 'insensitive' } }, { name: { contains: search, mode: 'insensitive' } }] } : {};
  const users = await platformDb.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, email: true, name: true, avatarUrl: true,
      banned: true, isSuperAdmin: true, twoFactorEnabled: true,
      lastLoginAt: true, createdAt: true,
      _count: { select: { ownedOrgs: true, memberships: true } },
    },
  });
  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await platformDb.user.update({
    where: { id: b.id },
    data: {
      ...(b.banned !== undefined && { banned: !!b.banned }),
      ...(b.isSuperAdmin !== undefined && { isSuperAdmin: !!b.isSuperAdmin }),
    },
  });
  return NextResponse.json({ id: updated.id, email: updated.email, banned: updated.banned, isSuperAdmin: updated.isSuperAdmin });
}
