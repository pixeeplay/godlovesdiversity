import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get('locale') || 'fr';
  const items = await prisma.menuItem.findMany({
    where: { locale },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    include: { children: { orderBy: { order: 'asc' } } }
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.label || !body.href) return NextResponse.json({ error: 'label + href required' }, { status: 400 });

  const last = await prisma.menuItem.findFirst({
    where: { parentId: body.parentId || null, locale: body.locale || 'fr' },
    orderBy: { order: 'desc' }
  });

  const item = await prisma.menuItem.create({
    data: {
      locale: body.locale || 'fr',
      label: body.label,
      href: body.href,
      external: !!body.external,
      parentId: body.parentId || null,
      order: body.order ?? ((last?.order || 0) + 1),
      published: body.published !== false
    }
  });
  return NextResponse.json({ ok: true, item });
}
