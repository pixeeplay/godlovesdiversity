import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const [listings, regions, articles] = await Promise.all([
    prisma.listing.count({ where: { status: 'PUBLISHED' } }).catch(() => 0),
    prisma.region.count().catch(() => 0),
    prisma.article.count({ where: { published: true } }).catch(() => 0)
  ]);

  // Estimate sitemap URLs (listings × 2 langues + regions × 2 + articles × 2 + static ~80)
  const sitemap_urls = listings * 2 + regions * 2 + articles * 2 + 80;

  return NextResponse.json({ listings, regions, articles, sitemap_urls });
}
