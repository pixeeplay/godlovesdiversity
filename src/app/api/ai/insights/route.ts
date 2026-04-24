import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiSentiment, aiClusterTestimonies, aiWeeklyDigest, aiEditorialCalendar } from '@/lib/ai';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { mode, text, items, monthDate, location } = await req.json();

  if (mode === 'sentiment') {
    const out = await aiSentiment(text);
    let parsed: any = {};
    try { parsed = JSON.parse(out.text || '{}'); } catch {}
    return NextResponse.json({ ...out, parsed });
  }

  if (mode === 'cluster') {
    const out = await aiClusterTestimonies(items || []);
    let parsed: any = {};
    try { parsed = JSON.parse(out.text || '{}'); } catch {}
    return NextResponse.json({ ...out, parsed });
  }

  if (mode === 'weekly') {
    const since = new Date(Date.now() - 7 * 86400000);
    const stats = {
      newPhotos: await prisma.photo.count({ where: { createdAt: { gte: since } } }),
      pendingPhotos: await prisma.photo.count({ where: { status: 'PENDING' } }),
      newSubscribers: await prisma.newsletterSubscriber.count({ where: { confirmedAt: { gte: since } } }),
      flaggedItems: await prisma.photo.count({ where: { status: 'FLAGGED' } }),
      articlesPublished: await prisma.article.count({ where: { publishedAt: { gte: since } } })
    };
    const out = await aiWeeklyDigest(stats);
    return NextResponse.json({ ...out, stats });
  }

  if (mode === 'calendar') {
    const out = await aiEditorialCalendar(monthDate || new Date().toISOString().slice(0, 7), location || 'monde');
    let parsed: any = {};
    try { parsed = JSON.parse(out.text || '{}'); } catch {}
    return NextResponse.json({ ...out, parsed });
  }

  if (mode === 'geo') {
    const photos = await prisma.photo.groupBy({
      by: ['country'],
      where: { status: 'APPROVED' },
      _count: true,
      orderBy: { _count: { country: 'desc' } },
      take: 10
    });
    return NextResponse.json({ countries: photos.map((p) => ({ country: p.country, count: p._count })) });
  }

  return NextResponse.json({ error: 'unknown mode' }, { status: 400 });
}
