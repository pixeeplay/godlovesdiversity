import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/venues/debug
 * Liste les 20 derniers venues + total + check schéma migré.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });

  let total = 0;
  let venues: any[] = [];
  let schemaOk = true;
  let errorMsg = '';

  try {
    total = await prisma.venue.count();
    venues = await prisma.venue.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: { id: true, slug: true, name: true, city: true, type: true, published: true, createdAt: true }
    });
  } catch (e: any) {
    schemaOk = false;
    errorMsg = e?.message || String(e);
  }

  // Check Connect schema
  let connectSchemaOk = false;
  let connectError = '';
  try {
    await prisma.connectProfile.count();
    connectSchemaOk = true;
  } catch (e: any) {
    connectError = e?.message || String(e);
  }

  return NextResponse.json({
    user: { id: (s.user as any).id, email: s.user.email, role: (s.user as any).role },
    venuesTotal: total,
    venuesSample: venues,
    schemaOk,
    errorMsg,
    connectSchema: { ok: connectSchemaOk, error: connectError }
  });
}
