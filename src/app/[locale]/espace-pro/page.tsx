import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Building2, Calendar, MapPin, Sparkles } from 'lucide-react';
import { ProEventsClient } from '@/components/ProEventsClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon espace pro — God Loves Diversity' };

export default async function EspaceProPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/espace-pro');

  const userId = (s.user as any).id;

  let venues: any[] = [];
  let events: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: { ownerId: userId },
      include: { _count: { select: { events: true, coupons: true } } },
      orderBy: { name: 'asc' }
    });
    if (venues.length > 0) {
      events = await prisma.event.findMany({
        where: { venueId: { in: venues.map(v => v.id) } },
        orderBy: { startsAt: 'desc' },
        take: 100
      });
    }
  } catch { /* migration */ }

  return (
    <main className="container-wide py-12 max-w-6xl">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-xl p-3">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl">Mon espace pro</h1>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Gère ton (tes) lieu(x) LGBT-friendly référencé(s) sur GLD, ajoute tes événements, propose des codes promo à la communauté.
          Tes événements apparaissent automatiquement sur l'agenda public et la fiche de ton lieu.
        </p>
      </header>

      {venues.length === 0 ? (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <Sparkles size={48} className="text-zinc-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tu n'es pas encore propriétaire d'un lieu sur GLD</h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-xl mx-auto">
            Tu gères un restaurant, bar, café, lieu de culte, hôtel, boutique LGBT-friendly ?
            Demande à être référencé : tu pourras gérer ta fiche, tes événements et offrir des codes promo à la communauté GLD.
          </p>
          <Link href="/contact?sujet=Demande+inscription+lieu+pro" className="inline-block bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold px-5 py-2.5 rounded-full text-sm">
            Demander mon accès pro
          </Link>
        </section>
      ) : (
        <>
          {/* Liste de mes venues */}
          <section className="mb-8">
            <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">Mes lieux ({venues.length})</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {venues.map((v) => (
                <Link key={v.id} href={`/lieux/${v.slug}`} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-fuchsia-500/40 transition">
                  <div className="font-bold text-white truncate">{v.name}</div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                    <MapPin size={11} /> {v.city || 'Ville ?'}{v.country ? `, ${v.country}` : ''}
                  </div>
                  <div className="flex gap-3 text-[10px] text-zinc-500 mt-2 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1"><Calendar size={10} /> {v._count?.events || 0} évén.</span>
                    <span>🏷 {v._count?.coupons || 0} promo(s)</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* CRUD events */}
          <ProEventsClient venues={venues} initialEvents={events} />
        </>
      )}
    </main>
  );
}
