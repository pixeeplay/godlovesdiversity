import { prisma } from '@/lib/prisma';
import { VenuesDirectory } from '@/components/VenuesDirectory';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lieux LGBTQ+ — God Loves Diversity' };

export default async function LieuxPage() {
  let venues: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: { published: true },
      include: { events: { where: { published: true, startsAt: { gte: new Date() } }, take: 2, orderBy: { startsAt: 'asc' } } },
      orderBy: [{ featured: 'desc' }, { rating: 'asc' }, { name: 'asc' }],
      take: 200
    });
  } catch { /* migration */ }

  return <VenuesDirectory initial={venues} />;
}
