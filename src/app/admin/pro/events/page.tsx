import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProEventsClient } from '@/components/ProEventsClient';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProEventsPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/admin/pro/events');

  const userId = (s.user as any).id;
  const isAdmin = (s.user as any).role === 'ADMIN';

  let venues: any[] = [];
  let events: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: isAdmin ? {} : { ownerId: userId },
      select: { id: true, name: true, slug: true }
    });
    if (venues.length > 0) {
      events = await prisma.event.findMany({
        where: { venueId: { in: venues.map(v => v.id) } },
        orderBy: { startsAt: 'desc' },
        take: 200
      });
    }
  } catch { /* migration */ }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <Link href="/admin/pro" className="text-fuchsia-400 hover:underline text-sm flex items-center gap-1 mb-3">
        <ArrowLeft size={14} /> Espace Pro
      </Link>
      <header className="flex items-center gap-3 mb-6">
        <div className="bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl p-2.5">
          <Calendar size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold leading-none">Mes événements</h1>
          <p className="text-zinc-400 text-xs mt-1">{venues.length} lieu(x) · {events.length} événement(s)</p>
        </div>
      </header>
      <ProEventsClient venues={venues} initialEvents={events} />
    </div>
  );
}
