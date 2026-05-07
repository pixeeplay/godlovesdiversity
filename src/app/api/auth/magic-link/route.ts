import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/magic-link
 * Body: { email }
 *
 * Envoie un email avec un lien de connexion magique (TTL 30 min, single-use).
 * Le lien : /admin/login?magicToken=...
 * Le clic sur le lien crée une session temporaire (provider 'magic-link' à câbler dans authOptions).
 *
 * En MVP simple : on génère un token, on l'envoie par email, et on le fait redeem
 * via une route /api/auth/magic-link/redeem qui crée un mdp temporaire et signe in
 * automatiquement (similaire au flow invitation).
 */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  if (!email.includes('@')) return NextResponse.json({ error: 'email-invalid' }, { status: 400 });

  // Vérifie que le user existe (sinon, on doit passer par signup)
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'no-account', message: 'Aucun compte avec cet email. Crée un compte d\'abord.' }, { status: 404 });
  }

  // Génère un token unique avec TTL 30 min, stocké en VerificationToken
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + 30 * 60_000);

  try {
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires }
    });

    const url = `https://gld.pixeeplay.com/api/auth/magic-link/redeem?token=${token}&email=${encodeURIComponent(email)}`;
    const html = `
      <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#222">
        <h1 style="color:#d61b80">✨ Lien magique GLD</h1>
        <p>Tu as demandé un lien de connexion magique. Clique sur le bouton ci-dessous pour te connecter (valable 30 min, usage unique) :</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${url}" style="display:inline-block;background:#d61b80;color:white;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:bold">
            Me connecter →
          </a>
        </p>
        <p style="font-size:11px;color:#888">
          Si tu n'as pas demandé ce lien, ignore cet email. Personne d'autre n'a tes identifiants.
        </p>
      </div>
    `;
    await sendEmail(email, '✨ Ton lien de connexion magique GLD', html, { type: 'admin-notify' });
    return NextResponse.json({ ok: true, message: 'Lien envoyé' });
  } catch (e: any) {
    return NextResponse.json({ error: 'send-failed', message: e?.message }, { status: 500 });
  }
}
