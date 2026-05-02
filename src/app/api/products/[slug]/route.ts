import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  try {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: {
        productVariants: {
          where: { published: true },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
        }
      }
    });
    if (!p || !p.published) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(p);
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
