import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VenueEditor } from '@/components/admin/VenueEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Édition établissement — GLD' };

export default async function P({ params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      _count: { select: { events: true, coupons: true } },
      owner: { select: { id: true, name: true, email: true } },
      events: { orderBy: { startsAt: 'desc' }, take: 10, select: { id: true, title: true, startsAt: true, published: true } },
      coupons: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, code: true, description: true, expiresAt: true } }
    }
  }).catch(() => null);

  if (!venue) notFound();

  return <VenueEditor venue={venue} />;
}
