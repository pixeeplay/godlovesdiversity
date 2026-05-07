import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET : renvoie l'état du consentement courant */
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { vocalPrayerConsent: true, vocalPrayerConsentedAt: true }
  });
  return NextResponse.json({
    ok: true,
    consent: !!u?.vocalPrayerConsent,
    consentedAt: u?.vocalPrayerConsentedAt
  });
}

/**
 * POST { consent: boolean }
 * Active ou révoque le consentement.
 * Si révoque + il y a des prières existantes, on prévient l'utilisateur (mais on ne supprime
 * pas tout — il peut le faire individuellement via DELETE par prière).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const consent = !!body?.consent;

  await prisma.user.update({
    where: { id: userId },
    data: {
      vocalPrayerConsent: consent,
      vocalPrayerConsentedAt: consent ? new Date() : null
    }
  });

  return NextResponse.json({ ok: true, consent });
}
