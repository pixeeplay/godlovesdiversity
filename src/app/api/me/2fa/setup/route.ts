import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Génère un secret TOTP aléatoire (base32) et retourne l'URL otpauth pour QR.
 * NB : pour MVP on stocke le secret en attente — il sera confirmé par /verify.
 */
export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const userId = (s.user as any).id;
  const email = s.user.email!;

  // Génère un secret base32 (16 chars)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  const secret = Array.from(arr).map(b => alphabet[b % 32]).join('');

  await prisma.setting.upsert({
    where: { key: `user.2fa.pending.${userId}` },
    update: { value: secret },
    create: { key: `user.2fa.pending.${userId}`, value: secret }
  });

  const issuer = 'GLD';
  const qrUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
  return NextResponse.json({ qrUrl, secret });
}
