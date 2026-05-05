import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/venues/[id]/debug — voir le venue brut + diag les includes.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login' }, { status: 401 });
  const { id } = await ctx.params;

  // 1) findUnique simple
  let basic: any = null;
  let basicErr = '';
  try { basic = await prisma.venue.findUnique({ where: { id } }); }
  catch (e: any) { basicErr = e?.message; }

  // 2) avec includes
  let full: any = null;
  let fullErr = '';
  try {
    full = await prisma.venue.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true, coupons: true } },
        owner: { select: { id: true, name: true, email: true } },
        events: { take: 5 },
        coupons: { take: 5 }
      }
    });
  } catch (e: any) { fullErr = e?.message; }

  return NextResponse.json({
    id,
    basicFound: !!basic,
    basicErr,
    fullFound: !!full,
    fullErr,
    basic,
    full
  });
}
