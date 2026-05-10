import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { platformDb } from '@pixeesite/database';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/2fa/setup
 * Génère un secret TOTP + URL pour QR code (otpauth://). User scan
 * dans Google Authenticator / 1Password / Authy.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secret = generateBase32Secret(20);
  const issuer = 'Pixeesite';
  const account = encodeURIComponent(session.user.email);
  const otpauthUrl = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&period=30&digits=6&algorithm=SHA1`;

  // On stocke le secret en attente (totpSecret) mais pas encore enabled
  await platformDb.user.update({
    where: { email: session.user.email },
    data: { totpSecret: secret, twoFactorEnabled: false },
  });

  return NextResponse.json({ ok: true, secret, otpauthUrl });
}

/**
 * POST /api/auth/2fa/verify
 * Body: { code }
 * Verify le code TOTP. Si OK, active twoFactorEnabled=true.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { code } = await req.json().catch(() => ({}));
  if (!code) return NextResponse.json({ error: 'code-required' }, { status: 400 });

  const user = await platformDb.user.findUnique({ where: { email: session.user.email } });
  if (!user?.totpSecret) return NextResponse.json({ error: 'no-secret-pending' }, { status: 400 });

  const expected = totp(user.totpSecret, Math.floor(Date.now() / 30000));
  const expectedPrev = totp(user.totpSecret, Math.floor(Date.now() / 30000) - 1);
  if (code !== expected && code !== expectedPrev) {
    return NextResponse.json({ error: 'invalid-code' }, { status: 400 });
  }

  await platformDb.user.update({
    where: { email: session.user.email },
    data: { twoFactorEnabled: true },
  });

  return NextResponse.json({ ok: true });
}

/** Base32 encoding pour secret TOTP. */
function generateBase32Secret(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
}

/** RFC 6238 TOTP implémentation minimaliste. */
function totp(secret: string, counter: number): string {
  // Decode base32 secret
  const decoded = base32Decode(secret);
  // Pack counter into 8-byte big-endian buffer
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', decoded).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = input.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of cleaned) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
