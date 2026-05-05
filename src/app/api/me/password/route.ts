import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { current, next } = await req.json();
  if (!current || !next || next.length < 8) return NextResponse.json({ error: '8 caractères minimum' }, { status: 400 });

  const u = await prisma.user.findUnique({ where: { id: (s.user as any).id } });
  if (!u?.passwordHash) return NextResponse.json({ error: 'Pas de mot de passe défini (compte créé via SSO)' }, { status: 400 });

  const ok = await bcrypt.compare(current, u.passwordHash);
  if (!ok) return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hash } });
  return NextResponse.json({ ok: true });
}
