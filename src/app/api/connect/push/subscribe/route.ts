import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireConnectUser } from '@/lib/connect';

export const dynamic = 'force-dynamic';

/**
 * Sauvegarde un abonnement WebPush.
 * Stocké dans Setting JSON keyed par userId pour MVP (modèle dédié à terme).
 */
export async function POST(req: NextRequest) {
  const u = await requireConnectUser();
  if (!u) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { subscription } = await req.json();
  if (!subscription?.endpoint) return NextResponse.json({ error: 'invalide' }, { status: 400 });

  const key = `connect.push.${u.id}`;
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(subscription) },
    create: { key, value: JSON.stringify(subscription) }
  });
  return NextResponse.json({ ok: true });
}
