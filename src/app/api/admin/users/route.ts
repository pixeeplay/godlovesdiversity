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

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true, image: true,
      createdAt: true, updatedAt: true, emailVerified: true
    }
  });
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const data = await req.json();
  if (!data.email) return NextResponse.json({ error: 'email obligatoire' }, { status: 400 });
  if (!data.password || data.password.length < 8) {
    return NextResponse.json({ error: 'mot de passe 8 caractères mini' }, { status: 400 });
  }
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) return NextResponse.json({ error: 'email déjà utilisé' }, { status: 409 });
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name || null,
      role: data.role || 'VIEWER',
      passwordHash
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true }
  });
  return NextResponse.json({ ok: true, user });
}
