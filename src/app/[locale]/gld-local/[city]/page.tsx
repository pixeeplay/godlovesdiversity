import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { MapPin, Calendar, Heart, ArrowLeft } from 'lucide-react';

const CITIES: Record<string, { name: string; emoji: string; intro: string; helpline?: string }> = {
  paris:     { name: 'Paris',     emoji: '🇫🇷', intro: 'La capitale historique du mouvement LGBT français.', helpline: 'SOS Homophobie 01 48 06 42 41' },
  lyon:      { name: 'Lyon',      emoji: '🇫🇷', intro: 'Communauté active autour du Marché LGBT Lyon Grande Ourse.', helpline: 'Forum Gay 04 78 27 10 10' },
  bruxelles: { name: 'Bruxelles', emoji: '🇧🇪', intro: 'RainbowHouse Brussels — pôle communautaire majeur en Belgique.', helpline: 'Tels Quels 02 512 45 87' },
  montreal:  { name: 'Montréal',  emoji: '🇨🇦', intro: 'Le Village est l\'un des plus grands quartiers LGBT au monde.', helpline: 'Interligne 1-888-505-1010' },
  berlin:    { name: 'Berlin',    emoji: '🇩🇪', intro: 'Capitale européenne de la fête queer et de l\'activisme.', helpline: 'Mann-O-Meter +49 30 216 8008' },
  nyc:       { name: 'New York',  emoji: '🇺🇸', intro: 'Stonewall, berceau du mouvement Pride moderne.', helpline: 'NYC LGBT Center 212-620-7310' }
};

export const dynamic = 'force-dynamic';

export default async function P({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const info = CITIES[city.toLowerCase()];
  if (!info) {
    return (
      <main className="container-wide py-12 text-center">
        <h1 className="text-2xl font-bold mb-3">Ville non encore référencée</h1>
        <p className="text-zinc-400 mb-4">Tu veux ouvrir GLD dans ta ville ? <Link href="/contact" className="text-fuchsia-400 underline">Postule comme coordinateur·rice</Link>.</p>
        <Link href="/" className="text-fuchsia-400">← Accueil</Link>
      </main>
    );
  }

  let venues: any[] = [];
  let events: any[] = [];
  try {
    venues = await prisma.venue.findMany({
      where: { city: { contains: info.name, mode: 'insensitive' }, published: true },
      take: 8,
      include: { _count: { select: { events: true } } }
    });
    const venueIds = venues.map(v => v.id);
    events = await prisma.event.findMany({
      where: { city: { contains: info.name, mode: 'insensitive' }, published: true, startsAt: { gte: new Date() } },
      take: 6,
      orderBy: { startsAt: 'asc' }
    });
  } catch {}

  return (
    <main className="container-wide py-12 max-w-5xl">
      <Link href="/lieux" className="text-fuchsia-400 hover:underline text-sm mb-3 inline-flex items-center gap-1"><ArrowLeft size={14} /> Tous les lieux</Link>
      <header className="mb-6">
        <div className="text-5xl mb-2">{info.emoji}</div>
        <h1 className="font-display font-bold text-4xl">GLD {info.name}</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl">{info.intro}</p>
        {info.helpline && <p className="text-amber-300 text-xs mt-2">📞 {info.helpline}</p>}
      </header>

      {events.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs uppercase font-bold text-fuchsia-400 mb-3 flex items-center gap-2"><Calendar size={12} /> À venir à {info.name}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {events.map(e => (
              <article key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
                <div className="font-bold text-sm">{e.title}</div>
                <div className="text-[10px] text-zinc-400 mt-1">📅 {new Date(e.startsAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}</div>
                {e.location && <div className="text-[10px] text-zinc-400">📍 {e.location}</div>}
              </article>
            ))}
          </div>
        </section>
      )}

      {venues.length > 0 && (
        <section>
          <h2 className="text-xs uppercase font-bold text-fuchsia-400 mb-3 flex items-center gap-2"><MapPin size={12} /> Lieux LGBT à {info.name} ({venues.length})</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {venues.map(v => (
              <Link key={v.id} href={`/lieux/${v.slug}`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-3">
                <div className="font-bold text-sm">{v.name}</div>
                <div className="text-[10px] text-zinc-400 mt-1">{v.type} · {v._count?.events || 0} évén.</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-4 text-center">
        <Heart size={20} className="text-fuchsia-400 mx-auto mb-1" />
        <p className="text-sm text-zinc-200">Tu es à {info.name} et veux animer la communauté locale ?</p>
        <Link href={`/contact?sujet=Coordinateur+GLD+${info.name}`} className="inline-block mt-2 bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full">Devenir coordinateur·rice</Link>
      </div>
    </main>
  );
}
