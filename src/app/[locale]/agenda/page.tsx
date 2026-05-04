import { prisma } from '@/lib/prisma';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

export const revalidate = 60;
export const metadata = { title: 'Agenda — God Loves Diversity' };

export default async function AgendaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where: { published: true, locale, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 100
    });
  } catch { events = []; }

  // Groupe par mois
  const byMonth = events.reduce<Record<string, any[]>>((acc, e) => {
    const key = new Date(e.startsAt).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  return (
    <main className="container-wide py-12">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-3">
            <Calendar size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl">Agenda</h1>
        </div>
        <p className="text-zinc-400 max-w-2xl">
          Tous les événements à venir du mouvement « God Loves Diversity » : rencontres, prières, célébrations, sessions d'écoute, conférences inclusives.
        </p>
      </header>

      {events.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Calendar size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">Aucun événement à venir pour le moment.</p>
          <p className="text-zinc-500 text-sm">Reviens bientôt — nous publions de nouveaux rendez-vous chaque mois.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(byMonth).map(([month, list]) => (
            <section key={month}>
              <h2 className="text-xs uppercase font-bold tracking-widest text-brand-pink mb-4">{month}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {list.map((e) => {
                  const start = new Date(e.startsAt);
                  const day = start.getDate();
                  const time = start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                  return (
                    <article
                      key={e.id}
                      className={`stained-card p-5 ${e.cancelled ? 'opacity-50' : ''}`}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                    >
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-16 text-center bg-zinc-900 rounded-lg p-2 border border-zinc-800">
                          <div className="text-2xl font-bold text-brand-pink">{day}</div>
                          <div className="text-[10px] text-zinc-400 uppercase">{time}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg truncate" style={{ color: 'var(--fg)' }}>
                            {e.cancelled && <span className="text-red-400 text-xs mr-2">[ANNULÉ]</span>}
                            {e.title}
                          </h3>
                          {e.location && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                              <MapPin size={11} /> {e.location}{e.city ? `, ${e.city}` : ''}
                            </div>
                          )}
                          {e.description && (
                            <p className="text-sm mt-2 line-clamp-3" style={{ color: 'var(--fg-muted)' }}>{e.description}</p>
                          )}
                          {e.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {e.tags.slice(0, 4).map((t: string) => (
                                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink border border-brand-pink/20">{t}</span>
                              ))}
                            </div>
                          )}
                          {e.url && (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-pink hover:underline mt-3"
                            >
                              En savoir plus <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
