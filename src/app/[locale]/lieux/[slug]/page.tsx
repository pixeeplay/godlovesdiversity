import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Phone, Mail, Globe, Calendar, Tag, ExternalLink, ArrowLeft, Instagram, Facebook } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let venue: any = null;
  try {
    venue = await prisma.venue.findUnique({
      where: { slug },
      include: {
        events: { where: { published: true, startsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' } },
        coupons: { where: { active: true } }
      }
    });
    if (!venue) notFound();
    await prisma.venue.update({ where: { id: venue.id }, data: { views: { increment: 1 } } }).catch(() => null);
  } catch { notFound(); }

  return (
    <main className="container-wide py-12 max-w-5xl">
      <Link href="/lieux" className="text-pink-400 hover:underline text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> Tous les lieux
      </Link>

      {venue.coverImage && (
        <div className="aspect-[16/7] rounded-2xl overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={venue.coverImage} alt={venue.name} className="w-full h-full object-cover" />
        </div>
      )}

      <header className="mb-6">
        <h1 className="font-display font-bold text-4xl mb-2">{venue.name}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
          {venue.city && <span className="flex items-center gap-1"><MapPin size={12} /> {venue.address ? venue.address + ', ' : ''}{venue.city}{venue.country ? `, ${venue.country}` : ''}</span>}
          {venue.phone && <a href={`tel:${venue.phone}`} className="flex items-center gap-1 text-pink-400 hover:underline"><Phone size={12} /> {venue.phone}</a>}
          {venue.website && <a href={venue.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline"><Globe size={12} /> Site</a>}
          {venue.email && <a href={`mailto:${venue.email}`} className="flex items-center gap-1 text-pink-400 hover:underline"><Mail size={12} /> {venue.email}</a>}
          {venue.instagram && <a href={`https://instagram.com/${venue.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline"><Instagram size={12} /> {venue.instagram}</a>}
          {venue.facebook && <a href={venue.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-pink-400 hover:underline"><Facebook size={12} /> Facebook</a>}
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {venue.description && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="font-bold mb-2">À propos</h2>
              <p className="text-zinc-300 text-sm whitespace-pre-wrap">{venue.description}</p>
            </section>
          )}

          {venue.tags?.length > 0 && (
            <section>
              <div className="flex flex-wrap gap-1.5">
                {venue.tags.map((t: string) => (
                  <span key={t} className="text-xs px-2 py-1 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">#{t}</span>
                ))}
              </div>
            </section>
          )}

          {venue.events?.length > 0 && (
            <section>
              <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3 flex items-center gap-2">
                <Calendar size={12} /> Événements à venir
              </h2>
              <div className="space-y-2">
                {venue.events.map((e: any) => (
                  <article key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                    <div className="font-bold text-white">{e.title}</div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {new Date(e.startsAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
                    </div>
                    {e.description && <p className="text-xs text-zinc-300 mt-2">{e.description.slice(0, 200)}</p>}
                    {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-pink-400 text-xs hover:underline inline-flex items-center gap-1 mt-2">Plus d'infos <ExternalLink size={10} /></a>}
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          {venue.coupons?.length > 0 && (
            <section className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-2 border-pink-500/40 rounded-2xl p-4">
              <h3 className="font-bold mb-2 flex items-center gap-2 text-pink-300">
                <Tag size={14} /> Codes promo GLD
              </h3>
              <p className="text-[11px] text-zinc-400 mb-3">Présente ces codes en boutique :</p>
              {venue.coupons.map((c: any) => (
                <div key={c.id} className="bg-zinc-950 border border-pink-500/30 rounded-lg p-2 mb-2 last:mb-0">
                  <code className="text-pink-400 font-bold text-sm">{c.code}</code>
                  <div className="text-[10px] text-zinc-400 mt-1">{c.description || `${c.discountValue}${c.discountKind === 'percent' ? '%' : ' centimes'} de réduction`}</div>
                </div>
              ))}
            </section>
          )}

          {venue.lat && venue.lng && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="font-bold mb-2 text-sm">Itinéraire</h3>
              <a href={`https://www.openstreetmap.org/?mlat=${venue.lat}&mlon=${venue.lng}#map=17/${venue.lat}/${venue.lng}`} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline text-xs flex items-center gap-1">
                Voir sur la carte <ExternalLink size={10} />
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline text-xs flex items-center gap-1 mt-1">
                Google Maps <ExternalLink size={10} />
              </a>
            </section>
          )}

          {venue.openingHours && (
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <h3 className="font-bold mb-2 text-sm">Horaires</h3>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans">{JSON.stringify(venue.openingHours, null, 2)}</pre>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
