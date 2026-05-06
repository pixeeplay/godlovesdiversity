import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProVenuesClient } from '@/components/admin/ProVenuesClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mes lieux Pro · GLD' };

export default async function ProVenuesPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/admin/pro/venues');
  const userId = (s.user as any).id;
  const userRole = (s.user as any).role;
  const isAdmin = userRole === 'ADMIN';

  let venues: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: isAdmin ? {} : { ownerId: userId },
      include: { _count: { select: { events: true, coupons: true } } },
      orderBy: [
        { featured: 'desc' },
        { freshnessScore: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' }
      ],
      take: isAdmin ? 500 : 100
    });
  } catch {
    // fallback si colonnes pas migrées
    try {
      venues = await prisma.venue.findMany({
        where: isAdmin ? {} : { ownerId: userId },
        include: { _count: { select: { events: true, coupons: true } } },
        orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }],
        take: isAdmin ? 500 : 100
      });
    } catch { /* schema not migrated */ }
  }

  return <ProVenuesClient initial={venues} isAdmin={isAdmin} />;
}
