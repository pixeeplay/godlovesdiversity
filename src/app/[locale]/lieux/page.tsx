import { prisma } from '@/lib/prisma';
import { VenuesDirectory } from '@/components/VenuesDirectory';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Lieux LGBTQ+ — parislgbt' };

export default async function LieuxPage() {
  let venues: any[] = [];
  try {
    // Récupère 400 venues, en triant les ENRICHIS EN PRIORITÉ :
    // 1. featured = true en premier
    // 2. freshnessScore desc (les fiches les plus complètes en premier)
    // 3. enrichedAt non null (passe les enrichis avant)
    // 4. coverImage non null (visuels en premier)
    // 5. rating (RAINBOW > FRIENDLY > NEUTRAL > CAUTION)
    // 6. name asc
    venues = await prisma.venue.findMany({
      where: { published: true },
      include: { events: { where: { published: true, startsAt: { gte: new Date() } }, take: 2, orderBy: { startsAt: 'asc' } } },
      orderBy: [
        { featured: 'desc' },
        { freshnessScore: { sort: 'desc', nulls: 'last' } },
        { enrichedAt: { sort: 'desc', nulls: 'last' } },
        { coverImage: { sort: 'asc', nulls: 'last' } },
        { rating: 'asc' },
        { name: 'asc' }
      ],
      take: 400
    });
  } catch (e: any) {
    // Fallback si certaines colonnes (freshnessScore, enrichedAt) ne sont pas encore migrées
    try {
      venues = await prisma.venue.findMany({
        where: { published: true },
        include: { events: { where: { published: true, startsAt: { gte: new Date() } }, take: 2, orderBy: { startsAt: 'asc' } } },
        orderBy: [{ featured: 'desc' }, { rating: 'asc' }, { name: 'asc' }],
        take: 400
      });
    } catch { /* schema not migrated */ }
  }

  return <VenuesDirectory initial={venues} />;
}
