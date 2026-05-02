import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await ctx.params;
  const data = await req.json();

  // Empêche le dernier ADMIN de se rétrograder
  if (data.role && data.role !== 'ADMIN') {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: 'impossible : il faut au moins 1 ADMIN' }, { status: 400 });
      }
    }
  }

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name || null;
  if (data.role) updateData.role = data.role;
  if (data.password) {
    if (data.password.length < 8) {
      return NextResponse.json({ error: 'mot de passe 8 caractères mini' }, { status: 400 });
    }
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true }
  });
  return NextResponse.json({ ok: true, user });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { id } = await ctx.params;

  // Empêche de se supprimer soi-même
  if ((s.user as any)?.id === id) {
    return NextResponse.json({ error: 'impossible : tu ne peux pas te supprimer toi-même' }, { status: 400 });
  }

  // Empêche de supprimer le dernier ADMIN
  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'impossible : il faut au moins 1 ADMIN' }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
