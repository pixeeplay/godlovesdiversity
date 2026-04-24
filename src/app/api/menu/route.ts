import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') || 'fr';
  try {
    const items = await prisma.menuItem.findMany({
      where: { locale, published: true, parentId: null },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { published: true },
          orderBy: { order: 'asc' }
        }
      }
    });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
