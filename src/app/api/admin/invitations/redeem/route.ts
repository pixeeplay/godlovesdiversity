import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/invitations/redeem
 * Body: { code: string }
 *
 * Quand un user clique sur le lien d'invitation /admin/login?invitation=CODE :
 *  1. Cette route vérifie le code (valide, non expiré, non utilisé)
 *  2. Crée ou trouve le user avec l'email
 *  3. Génère un mot de passe temporaire et l'envoie par email
 *  4. Marque l'invitation comme utilisée
 *
 * Le user peut ensuite se connecter avec email + mot de passe temporaire,
 * et est invité à le changer immédiatement.
 */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').trim();
  if (!code) return NextResponse.json({ error: 'code-missing' }, { status: 400 });

  try {
    const invitation = await (prisma as any).adminInvitation.findUnique({ where: { code } });
    if (!invitation) return NextResponse.json({ error: 'code-invalid' }, { status: 404 });
    if (invitation.usedAt) return NextResponse.json({ error: 'already-used' }, { status: 400 });
    if (new Date(invitation.expiresAt) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 410 });

    // Génère un mot de passe temporaire (12 chars aléatoires)
    const tempPassword = crypto.randomBytes(9).toString('base64url').slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Crée ou met à jour le user
    const user = await prisma.user.upsert({
      where: { email: invitation.email },
      update: { role: invitation.role as any, passwordHash },
      create: {
        email: invitation.email,
        name: invitation.email.split('@')[0],
        role: invitation.role as any,
        passwordHash,
        emailVerified: new Date()
      }
    });

    // Marque l'invitation comme utilisée
    const ua = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '';
    await (prisma as any).adminInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date(), usedByUa: ua.slice(0, 200), usedByIp: ip.slice(0, 64) }
    });

    // Envoie le mot de passe temporaire par email
    const html = `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#222">
        <h1 style="color:#d61b80">🔑 Ton accès GLD Admin</h1>
        <p>Bienvenue ! Ton invitation a été acceptée. Voici tes identifiants temporaires :</p>
        <div style="background:#fef0e6;border-left:4px solid #d61b80;padding:16px;border-radius:8px;margin:24px 0">
          <p style="margin:0"><strong>Email :</strong> <code>${invitation.email}</code></p>
          <p style="margin:8px 0 0"><strong>Mot de passe temporaire :</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px">${tempPassword}</code></p>
        </div>
        <p style="color:#dc2626;font-weight:bold">⚠ Change ce mot de passe à ta première connexion (Mon profil → Sécurité).</p>
        <p style="text-align:center;margin:32px 0">
          <a href="https://gld.pixeeplay.com/admin/login" style="display:inline-block;background:#d61b80;color:white;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:bold">
            Se connecter →
          </a>
        </p>
      </div>
    `;
    await sendEmail(invitation.email, '🔑 Ton accès GLD Admin (mot de passe temporaire)', html, { type: 'admin-notify' }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: '✓ Ton accès est créé. Vérifie ta boîte mail pour le mot de passe.',
      email: invitation.email
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'redeem-failed', message: e?.message }, { status: 500 });
  }
}
