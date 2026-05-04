import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VenuesAdmin } from '@/components/admin/VenuesAdmin';

export const dynamic = 'force-dynamic';

export default async function AdminVenuesPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  let venues: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      include: { _count: { select: { events: true, coupons: true } } },
      orderBy: { createdAt: 'desc' }
    });
  } catch { /* migration */ }
  return <VenuesAdmin initial={venues} />;
}
