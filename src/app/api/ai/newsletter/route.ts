import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiNewsletterMonth } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const since = new Date(Date.now() - 30 * 86400000);
  const [photos, subs, articles, countries] = await Promise.all([
    prisma.photo.count({ where: { status: 'APPROVED', createdAt: { gte: since } } }),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE', confirmedAt: { gte: since } } }),
    prisma.article.findMany({
      where: { published: true, publishedAt: { gte: since } },
      take: 3, orderBy: { publishedAt: 'desc' }, select: { title: true, excerpt: true }
    }),
    prisma.photo.groupBy({ by: ['country'], where: { status: 'APPROVED', createdAt: { gte: since } }, _count: true })
  ]);

  const out = await aiNewsletterMonth({
    photosThisMonth: photos,
    newSubscribers: subs,
    articles,
    topCountries: countries.slice(0, 5).map((c) => `${c.country}: ${c._count}`)
  });
  return NextResponse.json(out);
}
