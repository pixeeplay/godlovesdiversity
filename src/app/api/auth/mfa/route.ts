import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSecret, totpUri, totpVerify, generateBackupCodes } from '@/lib/totp';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET    /api/auth/mfa                — état actuel du MFA pour l'user connecté
 * POST   /api/auth/mfa?action=enroll  — génère secret + QR code + backup codes (pas encore activé)
 * POST   /api/auth/mfa?action=verify  — vérifie un code et active le MFA (clôture l'enroll)
 * POST   /api/auth/mfa?action=verify-login — vérifie un code lors du login (existant déjà actif)
 * DELETE /api/auth/mfa                — désactive le MFA
 */

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (s.user as any).id;

  const mfa = await (prisma as any).userMfa.findUnique({ where: { userId } });
  return NextResponse.json({
    enabled: !!mfa?.enabledAt,
    enrolled: !!mfa,
    smsEnabled: mfa?.smsEnabled || false,
    hasPhone: !!mfa?.smsPhone,
    backupCodesCount: mfa?.backupCodes?.length || 0
  });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const body = await req.json().catch(() => ({}));

  // Action verify-login peut être appelée sans session établie complètement
  if (action === 'verify-login') return verifyLogin(body);

  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (s.user as any).id;
  const email = s.user.email!;

  if (action === 'enroll') return enroll(userId, email);
  if (action === 'verify') return verifyEnroll(userId, body);

  return NextResponse.json({ error: 'action-unknown' }, { status: 400 });
}

export async function DELETE() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const userId = (s.user as any).id;
  try {
    await (prisma as any).userMfa.delete({ where: { userId } });
  } catch {}
  return NextResponse.json({ ok: true });
}

async function enroll(userId: string, email: string) {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, 8)));
  const uri = totpUri(secret, email, 'GLD Admin');
  const qr = await QRCode.toDataURL(uri, { width: 280, margin: 1 });

  // Upsert UserMfa (mais pas activé tant que verify pas appelé)
  await (prisma as any).userMfa.upsert({
    where: { userId },
    update: { totpSecret: secret, backupCodes: hashedCodes, enabledAt: null },
    create: { userId, totpSecret: secret, backupCodes: hashedCodes }
  });

  return NextResponse.json({
    ok: true,
    secret,             // pour copier-coller manuel si pas de QR scanner
    uri,
    qrCodeDataUrl: qr,
    backupCodes,        // affichés UNE SEULE FOIS
    message: 'Scanne le QR code avec Google Authenticator / Microsoft Authenticator / Authy / 1Password puis valide en entrant le code à 6 chiffres.'
  });
}

async function verifyEnroll(userId: string, body: any) {
  const code = String(body.code || '');
  const mfa = await (prisma as any).userMfa.findUnique({ where: { userId } });
  if (!mfa) return NextResponse.json({ error: 'not-enrolled' }, { status: 400 });
  if (!totpVerify(mfa.totpSecret, code)) {
    return NextResponse.json({ error: 'invalid-code' }, { status: 400 });
  }
  await (prisma as any).userMfa.update({
    where: { userId },
    data: { enabledAt: new Date(), verifiedAt: new Date() }
  });
  return NextResponse.json({ ok: true, message: '✓ 2FA activé. À chaque connexion tu devras entrer un code.' });
}

async function verifyLogin(body: any) {
  const email = String(body.email || '').toLowerCase();
  const code = String(body.code || '');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'invalid' }, { status: 401 });

  const mfa = await (prisma as any).userMfa.findUnique({ where: { userId: user.id } });
  if (!mfa?.enabledAt) {
    return NextResponse.json({ ok: true, mfaRequired: false });
  }

  // Try TOTP code
  if (totpVerify(mfa.totpSecret, code)) {
    return NextResponse.json({ ok: true, method: 'totp' });
  }

  // Try backup code (consume it)
  for (let i = 0; i < (mfa.backupCodes || []).length; i++) {
    const ok = await bcrypt.compare(code.replace(/\s/g, ''), mfa.backupCodes[i]);
    if (ok) {
      const remaining = [...mfa.backupCodes];
      remaining.splice(i, 1);
      await (prisma as any).userMfa.update({
        where: { userId: user.id },
        data: { backupCodes: remaining }
      });
      return NextResponse.json({ ok: true, method: 'backup-code', backupCodesRemaining: remaining.length });
    }
  }

  return NextResponse.json({ error: 'invalid-code' }, { status: 401 });
}
