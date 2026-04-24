import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiTranslate } from '@/lib/ai';

const TARGETS = ['en', 'es', 'pt'] as const;

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sources = await prisma.menuItem.findMany({ where: { locale: 'fr' } });
  let count = 0;
  for (const src of sources) {
    for (const target of TARGETS) {
      const tLabel = await aiTranslate(src.label, target);
      const existing = await prisma.menuItem.findFirst({
        where: { href: src.href, locale: target, parentId: src.parentId }
      });
      const data = {
        locale: target,
        label: (tLabel as any).text || src.label,
        href: src.href,
        external: src.external,
        parentId: src.parentId,
        order: src.order,
        published: src.published
      };
      if (existing) await prisma.menuItem.update({ where: { id: existing.id }, data });
      else await prisma.menuItem.create({ data });
      count++;
    }
  }
  return NextResponse.json({ ok: true, count });
}
