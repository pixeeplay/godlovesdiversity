import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/magic-link/redeem?token=...&email=...
 * Vérifie le token magic link et redirige vers /admin/login avec un mdp temporaire en URL.
 * Le user le copie-colle ou se connecte automatiquement.
 *
 * Note : pour une vraie session NextAuth, il faudrait câbler un provider custom.
 * En MVP : on génère un mdp temporaire, on l'envoie par email, et le user se connecte normalement.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');
  if (!token || !email) {
    return NextResponse.redirect(new URL('/admin/login?err=invalid', req.url));
  }

  try {
    const vt = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier: email, token } }
    });
    if (!vt) {
      return NextResponse.redirect(new URL('/admin/login?err=invalid', req.url));
    }
    if (new Date(vt.expires) < new Date()) {
      await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });
      return NextResponse.redirect(new URL('/admin/login?err=expired', req.url));
    }

    // Token valide → génère un mdp temporaire et update l'user
    const tempPassword = crypto.randomBytes(9).toString('base64url').slice(0, 14);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash, emailVerified: new Date() }
    });
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });

    // Redirige vers la page de login avec email pré-rempli + un message + le mdp en URL (single-use)
    const params = new URLSearchParams({
      email,
      tempPassword,
      msg: 'magic-link-success'
    });
    return NextResponse.redirect(new URL(`/admin/login?${params}`, req.url));
  } catch (e: any) {
    return NextResponse.redirect(new URL('/admin/login?err=server', req.url));
  }
}
