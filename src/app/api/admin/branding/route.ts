import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings, setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const KEYS = {
  qrCodeUrl: 'branding.qrCodeUrl',
  qrCodeTarget: 'branding.qrCodeTarget',
  primaryColor: 'branding.primaryColor',
  fontFamily: 'branding.fontFamily',
  logoUrl: 'branding.logoUrl'
};

/**
 * GET /api/admin/branding — config branding actuelle
 * POST /api/admin/branding — update (body: { qrCodeUrl, qrCodeTarget, primaryColor, fontFamily, logoUrl })
 *
 * GET public version (sans auth) renvoie uniquement les champs publics utiles au front.
 */
export async function GET(req: NextRequest) {
  const isPublic = new URL(req.url).searchParams.get('public') === '1';
  const cfg = await getSettings(Object.values(KEYS));
  if (isPublic) {
    return NextResponse.json({
      qrCodeUrl: cfg[KEYS.qrCodeUrl] || null,
      qrCodeTarget: cfg[KEYS.qrCodeTarget] || 'https://gld.pixeeplay.com',
      primaryColor: cfg[KEYS.primaryColor] || '#d4537e',
      logoUrl: cfg[KEYS.logoUrl] || null
    }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  }
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({
    qrCodeUrl: cfg[KEYS.qrCodeUrl] || '',
    qrCodeTarget: cfg[KEYS.qrCodeTarget] || 'https://gld.pixeeplay.com',
    primaryColor: cfg[KEYS.primaryColor] || '#d4537e',
    fontFamily: cfg[KEYS.fontFamily] || 'Georgia, serif',
    logoUrl: cfg[KEYS.logoUrl] || ''
  });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  for (const [k, val] of Object.entries(body)) {
    const settingKey = (KEYS as any)[k];
    if (settingKey && typeof val === 'string') {
      await setSetting(settingKey, val);
    }
  }
  return NextResponse.json({ ok: true });
}
