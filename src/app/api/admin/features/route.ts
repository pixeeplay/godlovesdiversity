import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { FEATURE_DEFINITIONS, getAllFeatureFlags } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = await getAllFeatureFlags();
  return NextResponse.json({ flags, definitions: FEATURE_DEFINITIONS });
}

export async function PATCH(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const { key, enabled } = await req.json();
    if (!(key in FEATURE_DEFINITIONS)) return NextResponse.json({ error: 'flag inconnu' }, { status: 400 });
    await prisma.setting.upsert({
      where: { key: `feature.${key}` },
      create: { key: `feature.${key}`, value: enabled ? 'on' : 'off' },
      update: { value: enabled ? 'on' : 'off' }
    });
    return NextResponse.json({ ok: true, key, enabled });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
