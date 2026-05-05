import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/signup
 * Crée un compte user normal (role VIEWER) — accessible publiquement.
 * Body : { email, password, name? }
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'email + password requis' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'mot de passe min 8 caractères' }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ error: 'cet email est déjà utilisé' }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || email.split('@')[0],
        passwordHash,
        role: 'VIEWER'
      },
      select: { id: true, email: true, name: true, role: true }
    });

    return NextResponse.json({ ok: true, user });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
