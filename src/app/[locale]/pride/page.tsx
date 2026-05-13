/**
 * /fr/pride — Calendrier exhaustif Pride 365 France 2026.
 * Hero, countdown prochaine Pride, timeline mensuelle, cards villes,
 * marches dissidentes, JSON-LD Event[].
 */
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Calendar, MapPin, Users, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { PRIDE_EVENTS_2026, getNextPride, groupByMonth, formatPrideDate, daysUntil } from '@/lib/pride-data';
import { PrideCover } from '@/components/PrideCover';
import { PrideCountdown } from '@/components/PrideCountdown';
import type { Metadata } from 'next';

export const dynamic = 'force-static';
export const revalidate = 3600;

type Params = { locale: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://parislgbt.com';
  return {
    title: 'Pride 365 — Calendrier complet 2026 des Marches LGBT en France',
    description: 'Toutes les Marches des Fiertés, festivals queer et marches dissidentes 2026 en France : Paris, Lyon, Marseille, Toulouse, Bordeaux, Lille, Nantes, Strasbourg, Montpellier, Nice et 8 autres villes.',
    keywords: ['Pride 2026', 'Marche des Fiertés', 'LGBT France', 'Pride Paris', 'Pride Lyon', 'Pride Marseille', 'Festigays', 'Existrans', 'Pride de Nuit'],
    alternates: { canonical: `${base}/${locale}/pride` },
    openGraph: {
      title: 'Pride 365 — Calendrier 2026 des Marches LGBT',
      description: '18 Marches officielles + dissidentes en France. Dates, lieux, organisateurs.',
      type: 'website',
      images: ['/og-default.svg']
    }
  };
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  'marche-officielle': { label: 'Marche officielle', color: '#FF2BB1' },
  'pride-nuit':        { label: 'Pride de Nuit',     color: '#1a1a1a' },
  'existrans':         { label: 'Existrans (trans)', color: '#5BCEFA' },
  'festival':          { label: 'Festival',          color: '#A855F7' },
  'sappho':            { label: 'Sappho',            color: '#FBBF24' },
  'inter-lgbt':        { label: 'Inter-LGBT',        color: '#22D3EE' }
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
};

export default async function PridePage({ params }: { params: Promise<Params> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const events = PRIDE_EVENTS_2026;
  const nextPride = getNextPride(events);
  const byMonth = groupByMonth(events);
  const monthKeys = Object.keys(byMonth).sort();

  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://parislgbt.com';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Pride 365 — Calendrier 2026',
    description: 'Calendrier exhaustif des Marches des Fiertés en France.',
    numberOfItems: events.length,
    itemListElement: events.map((e, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Event',
        name: e.name,
        startDate: `${e.date}T${e.time || '14:00'}:00+02:00`,
        location: {
          '@type': 'Place',
          name: e.city,
          address: { '@type': 'PostalAddress', addressLocality: e.city, postalCode: e.postalCode, addressCountry: 'FR' },
          geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng }
        },
        description: e.description,
        organizer: e.organizer ? { '@type': 'Organization', name: e.organizer, url: e.website } : undefined,
        url: `${base}/${locale}/pride#${e.id}`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode'
      }
    }))
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="min-h-screen">
        {/* ───── HERO ───── */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-cyan-500/10" />
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,43,177,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(34,211,238,0.12) 0%, transparent 50%)'
          }} />
          <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-pink-300 font-bold">Pride 365</span>
              <span className="text-white/30">·</span>
              <span className="text-xs text-white/50">{events.length} events · {monthKeys.length} mois</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-black gradient-text mb-6 leading-[0.95]">
              Calendrier complet<br />
              Pride 2026
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl">
              Toutes les Marches des Fiertés, festivals queer, marches dissidentes et events spéciaux Pride en France.
            </p>
          </div>
        </section>

        {/* ───── COUNTDOWN PROCHAINE PRIDE ───── */}
        {nextPride && (
          <section className="relative -mt-8 mb-16 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-3xl border-2 border-white/10 overflow-hidden shadow-2xl">
                <PrideCover event={nextPride} variant="hero" />
                <div className="bg-zinc-950 p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold px-2 py-1 rounded-full" style={{ background: `${nextPride.colors[0]}22`, color: nextPride.colors[0] }}>
                      Prochaine Pride
                    </span>
                    <span className="text-xs text-white/50">{TYPE_LABELS[nextPride.type]?.label}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-black mb-2">{nextPride.name}</h2>
                  <p className="text-white/60 mb-4 flex items-center gap-3 flex-wrap text-sm">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatPrideDate(nextPride.date, locale as 'fr' | 'en')}</span>
                    {nextPride.time && <span className="flex items-center gap-1.5"><Clock size={14} /> {nextPride.time}</span>}
                    <span className="flex items-center gap-1.5"><MapPin size={14} /> {nextPride.city}</span>
                    {nextPride.expectedAttendance && <span className="flex items-center gap-1.5"><Users size={14} /> {nextPride.expectedAttendance}</span>}
                  </p>
                  <PrideCountdown targetDate={nextPride.date} />
                  <p className="text-sm text-white/70 mt-4">{nextPride.description}</p>
                  {nextPride.website && (
                    <a href={nextPride.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-pink-300 hover:text-pink-200 transition">
                      Site officiel <ArrowRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ───── TIMELINE MOIS PAR MOIS ───── */}
        <section className="max-w-6xl mx-auto px-6 py-12">
          {monthKeys.map((monthKey) => {
            const [year, month] = monthKey.split('-');
            const monthEvents = byMonth[monthKey];
            return (
              <div key={monthKey} className="mb-16">
                <div className="flex items-baseline gap-3 mb-6">
                  <h2 className="font-display text-3xl md:text-4xl font-black text-white">
                    {MONTH_LABELS[month]}
                  </h2>
                  <span className="text-xl text-white/30 font-bold">{year}</span>
                  <span className="text-xs text-white/50 ml-auto">{monthEvents.length} event{monthEvents.length > 1 ? 's' : ''}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {monthEvents.map((event) => {
                    const days = daysUntil(event.date);
                    const isToday = days === 0;
                    const isPast = days < 0;
                    const isUpcoming = days > 0 && days < 30;
                    return (
                      <article
                        key={event.id}
                        id={event.id}
                        className="group relative rounded-2xl border border-white/10 hover:border-white/30 overflow-hidden bg-zinc-950/50 transition-all hover:-translate-y-1 hover:shadow-2xl"
                      >
                        <div className="relative">
                          <PrideCover event={event} variant="card" />
                          {isUpcoming && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-pink-500 text-white text-[10px] font-bold animate-pulse">
                              Dans {days} j
                            </div>
                          )}
                          {isToday && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black animate-pulse">
                              AUJOURD&apos;HUI
                            </div>
                          )}
                          {isPast && (
                            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-zinc-700 text-white/60 text-[10px] font-bold">
                              Passé
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: `${event.colors[0]}22`, color: event.colors[0] }}>
                              {TYPE_LABELS[event.type]?.label}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-white mb-1 group-hover:text-pink-300 transition">{event.name}</h3>
                          <p className="text-xs text-white/50 mb-3 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1"><Calendar size={11} /> {formatPrideDate(event.date, locale as 'fr' | 'en')}</span>
                            {event.time && <span>· {event.time}</span>}
                          </p>
                          <p className="text-sm text-white/70 line-clamp-2 mb-3">{event.description}</p>
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/5">
                            <Link
                              href={`/${locale}/region/${event.region}` as any}
                              className="text-xs text-white/50 hover:text-pink-300 flex items-center gap-1 truncate transition"
                            >
                              <MapPin size={11} /> {event.city}
                            </Link>
                            {event.expectedAttendance && (
                              <span className="text-xs text-white/40 flex items-center gap-1">
                                <Users size={11} /> {event.expectedAttendance}
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        {/* ───── CTA bas de page ───── */}
        <section className="bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent border-t border-white/10 py-16">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <Sparkles size={32} className="text-pink-400 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-display font-black mb-3">Tu organises une Pride ou un event LGBT ?</h2>
            <p className="text-white/60 mb-6">Soumets ton event pour qu&apos;il apparaisse ici l&apos;année prochaine, ou contacte-nous pour les corrections.</p>
            <Link
              href={`/${locale}/contact` as any}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 text-white font-bold transition"
            >
              Soumettre un event <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
