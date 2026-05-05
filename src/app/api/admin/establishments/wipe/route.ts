import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/establishments/wipe
 * Supprime tous les venues sans owner (= ceux importés en masse).
 * Préserve les venues créés manuellement avec un ownerId.
 */
export async function DELETE() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const result = await prisma.venue.deleteMany({ where: { ownerId: null } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
