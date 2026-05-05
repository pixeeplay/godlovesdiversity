import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser, getOrCreateConnectProfile } from '@/lib/connect';

export const dynamic = 'force-dynamic';

export async function GET() {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const profile = await getOrCreateConnectProfile(u.id);
  return NextResponse.json({ profile });
}

export async function PATCH(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const data = await req.json();

  await getOrCreateConnectProfile(u.id);
  const allowed: any = {};
  for (const k of [
    'displayName', 'birthYear', 'city', 'country', 'bio', 'photos',
    'showInMur', 'showInRencontres', 'showInPro',
    'intentions', 'quote', 'maxDistanceKm', 'ageRangeMin', 'ageRangeMax', 'showOnlyVerified',
    'jobTitle', 'proCategory', 'proPitch', 'proAvailable', 'proRate',
    'identity', 'traditions', 'lat', 'lng'
  ]) {
    if (data[k] !== undefined) allowed[k] = data[k];
  }

  // Vérifie 18+ pour activer Rencontres
  if (allowed.showInRencontres) {
    const yr = allowed.birthYear || (await prisma.connectProfile.findUnique({ where: { userId: u.id } }))?.birthYear;
    if (!yr || (new Date().getFullYear() - yr) < 18) {
      return NextResponse.json({ error: 'Le mode Rencontres exige 18 ans+ et la date de naissance.' }, { status: 400 });
    }
  }

  const profile = await prisma.connectProfile.update({ where: { userId: u.id }, data: allowed });
  return NextResponse.json({ ok: true, profile });
}
