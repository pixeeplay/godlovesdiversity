import { prisma } from '@/lib/prisma';
import { CalendrierReligieuxClient } from '@/components/CalendrierReligieuxClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Calendrier religieux mondial · LGBT-friendly · GLD',
  description: 'Toutes les fêtes religieuses (christianisme, islam, judaïsme, bouddhisme, hindouisme, sikhisme, inter-religieux) avec notes d\'inclusivité LGBT.'
};

export default async function CalendrierReligieuxPage() {
  let events: any[] = [];
  try {
    events = await (prisma as any).religiousEvent.findMany({
      where: { published: true, startsAt: { gte: new Date(new Date().getFullYear() - 1, 0, 1) } },
      orderBy: { startsAt: 'asc' },
      take: 300
    });
  } catch { /* migration not applied yet */ }

  return <CalendrierReligieuxClient events={events} />;
}
