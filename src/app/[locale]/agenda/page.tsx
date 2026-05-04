import { prisma } from '@/lib/prisma';
import { setRequestLocale } from 'next-intl/server';
import { AgendaClient } from '@/components/AgendaClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agenda — God Loves Diversity' };

export default async function AgendaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where: { published: true, startsAt: { gte: new Date() } },
      include: {
        venue: { select: { id: true, slug: true, name: true, type: true, city: true, country: true, coverImage: true } }
      },
      orderBy: { startsAt: 'asc' },
      take: 200
    });
  } catch { events = []; }

  return <AgendaClient initial={events} />;
}
