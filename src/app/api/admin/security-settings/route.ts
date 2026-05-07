import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings, setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEYS = [
  'security.allowSignup',
  'security.allowMagicLink',
  'security.allowGoogle',
  'security.allowApple',
  'security.allowInvitation',
  'security.emailVerificationRequired',
  'security.twoFactorRequired',
  'security.adminTailscaleOnly',
  'security.lockoutAfterFailedLogins',
  'security.sessionDurationDays',
  'security.passwordMinLength'
];

const DEFAULTS: Record<string, any> = {
  'security.allowSignup': true,
  'security.allowMagicLink': true,
  'security.allowGoogle': false,
  'security.allowApple': false,
  'security.allowInvitation': true,
  'security.emailVerificationRequired': true,
  'security.twoFactorRequired': false,
  'security.adminTailscaleOnly': false,
  'security.lockoutAfterFailedLogins': 5,
  'security.sessionDurationDays': 30,
  'security.passwordMinLength': 10
};

function parseValue(raw: string | undefined, defaultValue: any): any {
  if (raw === undefined || raw === null) return defaultValue;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  const n = Number(raw);
  if (!isNaN(n)) return n;
  return raw;
}

export async function GET() {
  const cfg = await getSettings(KEYS).catch(() => ({} as Record<string, string>));
  const out: Record<string, any> = {};
  for (const k of KEYS) {
    const shortKey = k.replace('security.', '');
    out[shortKey] = parseValue(cfg[k], DEFAULTS[k]);
  }
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  for (const [shortKey, val] of Object.entries(body)) {
    const k = `security.${shortKey}`;
    if (KEYS.includes(k)) {
      await setSetting(k, String(val));
    }
  }
  return NextResponse.json({ ok: true });
}
