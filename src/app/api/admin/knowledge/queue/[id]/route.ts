import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const data = await req.json();
  const updated = await prisma.unansweredQuery.update({
    where: { id },
    data: {
      status: data.status,
      adminAnswer: data.adminAnswer ?? undefined
    }
  });
  return NextResponse.json(updated);
}
