import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { createHmac, randomBytes } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── TOTP RFC 6238 (pure, no deps) ──────────────────────────────
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const cleaned = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const c of cleaned) {
    const i = BASE32.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totp(secret: string, t = Math.floor(Date.now() / 30000)): string {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(t));
  const hmac = createHmac('sha1', base32Decode(secret)).update(buf).digest();
  const off = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac[off] & 0x7f) << 24) | ((hmac[off + 1] & 0xff) << 16) | ((hmac[off + 2] & 0xff) << 8) | (hmac[off + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, '0');
}

function verifyTotp(secret: string, code: string): boolean {
  const t = Math.floor(Date.now() / 30000);
  return [t - 1, t, t + 1].some((tt) => totp(secret, tt) === code);
}

// ── Endpoints ──────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const db = await getTenantPrisma(slug);
  const sec = await (db as any).twoFactorSecret?.findUnique({ where: { userEmail: auth.user.email! } }).catch(() => null);
  return NextResponse.json({ enabled: !!sec?.enabled });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  const db = await getTenantPrisma(slug);

  if (b.action === 'init') {
    const secret = base32Encode(randomBytes(20));
    const issuer = encodeURIComponent('Pixeesite');
    const account = encodeURIComponent(auth.user.email || 'user');
    const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    await (db as any).twoFactorSecret.upsert({
      where: { userEmail: auth.user.email! },
      create: { userEmail: auth.user.email!, secret, enabled: false },
      update: { secret, enabled: false },
    });
    return NextResponse.json({ secret, otpauth });
  }

  if (b.action === 'enable') {
    const sec = await (db as any).twoFactorSecret.findUnique({ where: { userEmail: auth.user.email! } });
    if (!sec) return NextResponse.json({ error: 'Init first' }, { status: 400 });
    if (!verifyTotp(sec.secret, String(b.code || ''))) return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'));
    await (db as any).twoFactorSecret.update({
      where: { userEmail: auth.user.email! },
      data: { enabled: true, recoveryCodes },
    });
    return NextResponse.json({ ok: true, recoveryCodes });
  }

  if (b.action === 'disable') {
    await (db as any).twoFactorSecret.update({
      where: { userEmail: auth.user.email! },
      data: { enabled: false, recoveryCodes: [] },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
