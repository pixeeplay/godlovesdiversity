import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EstablishmentsAdmin } from '@/components/admin/EstablishmentsAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Établissements — GLD Admin' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');

  let venues: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      include: { _count: { select: { events: true, coupons: true } }, owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }
    });
  } catch {}

  return <EstablishmentsAdmin initial={venues} />;
}
