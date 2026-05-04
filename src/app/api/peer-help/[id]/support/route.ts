import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/peer-help/[id]/support — un user clique "je suis là pour toi" (anonyme, +1)
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const updated = await prisma.peerHelp.update({
      where: { id },
      data: { supportCount: { increment: 1 } },
      select: { supportCount: true }
    });
    return NextResponse.json({ ok: true, supportCount: updated.supportCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
