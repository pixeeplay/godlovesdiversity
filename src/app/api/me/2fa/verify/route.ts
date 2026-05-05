import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function base32Decode(s: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of s.toUpperCase()) {
    const idx = alphabet.indexOf(c);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totp(secret: string, t = Math.floor(Date.now() / 30000)): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(t));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return (code % 1_000_000).toString().padStart(6, '0');
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const userId = (s.user as any).id;
  const { code } = await req.json();
  if (!code || code.length !== 6) return NextResponse.json({ error: 'code 6 chiffres' }, { status: 400 });

  const pending = await prisma.setting.findUnique({ where: { key: `user.2fa.pending.${userId}` } });
  if (!pending?.value) return NextResponse.json({ error: 'aucune configuration en attente' }, { status: 400 });

  // Vérifie code actuel + ±1 fenêtre (30s) pour tolérance
  const now = Math.floor(Date.now() / 30000);
  const valid = [now - 1, now, now + 1].some((t) => totp(pending.value, t) === code);
  if (!valid) return NextResponse.json({ error: 'code invalide' }, { status: 400 });

  await prisma.setting.upsert({
    where: { key: `user.2fa.${userId}` },
    update: { value: pending.value },
    create: { key: `user.2fa.${userId}`, value: pending.value }
  });
  await prisma.setting.delete({ where: { key: `user.2fa.pending.${userId}` } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
