'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ExternalLink, List, Grid3x3, Filter, Search, Sparkles } from 'lucide-react';

type AgendaEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  city?: string | null;
  country?: string | null;
  coverImage?: string | null;
  url?: string | null;
  tags: string[];
  cancelled: boolean;
  venueId?: string | null;
  venue?: { id: string; slug: string; name: string; type: string; city?: string | null; country?: string | null; coverImage?: string | null } | null;
};

type View = 'list' | 'calendar';

export function AgendaClient({ initial }: { initial: AgendaEvent[] }) {
  const [view, setView] = useState<View>('list');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [venueId, setVenueId] = useState('');
  const [q, setQ] = useState('');
  const [refMonth, setRefMonth] = useState(() => new Date());

  const cities = useMemo(() => Array.from(new Set(initial.map(e => e.city || e.venue?.city).filter(Boolean))).sort() as string[], [initial]);
  const countries = useMemo(() => Array.from(new Set(initial.map(e => e.country || e.venue?.country).filter(Boolean))).sort() as string[], [initial]);
  const venues = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const e of initial) if (e.venue) seen.set(e.venue.id, { id: e.venue.id, name: e.venue.name });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [initial]);

  const filtered = useMemo(() => initial.filter(e => {
    const c = e.city || e.venue?.city || '';
    const p = e.country || e.venue?.country || '';
    if (city && c !== city) return false;
    if (country && p !== country) return false;
    if (venueId && e.venueId !== venueId) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (!e.title.toLowerCase().includes(ql) && !(e.description?.toLowerCase().includes(ql)) && !(e.venue?.name.toLowerCase().includes(ql))) return false;
    }
    return true;
  }), [initial, city, country, venueId, q]);

  return (
    <main className="container-wide py-12">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-3">
              <Calendar size={28} className="text-white" />
            </div>
            <h1 className="font-display font-bold text-4xl">Agenda</h1>
          </div>
          <p className="text-zinc-400 max-w-2xl text-sm">
            Tous les événements LGBTQ+ inclusifs : prières, rencontres, concerts, marches, conférences. Filtre par ville ou par lieu.
          </p>
        </div>
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${view === 'list' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <List size={12} /> Liste
          </button>
          <button onClick={() => setView('calendar')} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${view === 'calendar' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
            <Grid3x3 size={12} /> Calendrier
          </button>
        </div>
      </header>

      {/* Filtres */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-6 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-zinc-500 ml-1" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Pays (tous)</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Ville (toutes)</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Lieu (tous)</option>
          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded-lg px-2">
          <Search size={12} className="text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher événement, description, lieu…" className="bg-transparent flex-1 px-1 py-1.5 text-xs outline-none" />
        </div>
        <span className="text-xs text-zinc-500 ml-auto pr-2">{filtered.length} évén.</span>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <Calendar size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">Aucun événement avec ces filtres.</p>
          <p className="text-zinc-500 text-sm">Tu organises un événement LGBT-friendly ? <Link href="/contact" className="text-fuchsia-400 hover:underline">Soumets-le</Link>.</p>
        </div>
      ) : view === 'list' ? (
        <ListView events={filtered} />
      ) : (
        <CalendarView events={filtered} refMonth={refMonth} setRefMonth={setRefMonth} />
      )}
    </main>
  );
}

/* ================= LISTE GROUPÉE PAR MOIS ================= */

function ListView({ events }: { events: AgendaEvent[] }) {
  const byMonth = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const k = new Date(e.startsAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries());
  }, [events]);

  return (
    <div className="space-y-10">
      {byMonth.map(([month, list]) => (
        <section key={month}>
          <h2 className="text-xs uppercase font-bold tracking-widest text-fuchsia-400 mb-4">{month}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {list.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ================= VUE CALENDRIER MENSUELLE ================= */

function CalendarView({ events, refMonth, setRefMonth }: { events: AgendaEvent[]; refMonth: Date; setRefMonth: (d: Date) => void }) {
  const year = refMonth.getFullYear();
  const month = refMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = lastDay.getDate();

  const cells: Array<{ date?: Date; events: AgendaEvent[] }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayEvents = events.filter(e => {
      const ed = new Date(e.startsAt);
      return ed.getFullYear() === year && ed.getMonth() === month && ed.getDate() === d;
    });
    cells.push({ date, events: dayEvents });
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setRefMonth(new Date(year, month - 1, 1))} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-4 py-2 text-sm">← Mois précédent</button>
        <h3 className="text-lg font-bold capitalize">{refMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setRefMonth(new Date(year, month + 1, 1))} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full px-4 py-2 text-sm">Mois suivant →</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(d => (
          <div key={d} className="text-[10px] uppercase text-zinc-500 font-bold text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const isToday = isCurrentMonth && c.date && c.date.getDate() === today.getDate();
          return (
            <div
              key={i}
              className={`min-h-[110px] rounded-lg p-1.5 border ${
                !c.date ? 'bg-transparent border-transparent' :
                isToday ? 'bg-fuchsia-500/10 border-fuchsia-500/40' :
                'bg-zinc-900 border-zinc-800'
              }`}
            >
              {c.date && (
                <>
                  <div className={`text-[11px] font-bold mb-1 ${isToday ? 'text-fuchsia-300' : 'text-zinc-400'}`}>{c.date.getDate()}</div>
                  <div className="space-y-1">
                    {c.events.slice(0, 3).map(e => (
                      <Link
                        key={e.id}
                        href={e.venue ? `/lieux/${e.venue.slug}` : (e.url || '#')}
                        target={e.venue ? '_self' : '_blank'}
                        className={`block text-[10px] px-1.5 py-0.5 rounded truncate ${e.cancelled ? 'bg-red-500/20 text-red-300 line-through' : 'bg-fuchsia-500/20 text-fuchsia-200 hover:bg-fuchsia-500/30'}`}
                        title={e.title}
                      >
                        {new Date(e.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {e.title}
                      </Link>
                    ))}
                    {c.events.length > 3 && (
                      <div className="text-[9px] text-zinc-500 px-1">+{c.events.length - 3} autres</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ================= CARTE D'ÉVÉNEMENT ================= */

function EventCard({ e }: { e: AgendaEvent }) {
  const start = new Date(e.startsAt);
  const day = start.getDate();
  const time = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <article
      className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-fuchsia-500/40 transition ${e.cancelled ? 'opacity-50' : ''}`}
    >
      {(e.coverImage || e.venue?.coverImage) && (
        <div className="aspect-[16/7] overflow-hidden bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={e.coverImage || e.venue?.coverImage || ''} alt={e.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4 flex gap-3">
        <div className="flex-shrink-0 w-14 text-center bg-zinc-950 rounded-lg p-2 border border-zinc-800">
          <div className="text-2xl font-bold text-fuchsia-400">{day}</div>
          <div className="text-[10px] text-zinc-400 uppercase">{time}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate text-white">
            {e.cancelled && <span className="text-red-400 text-xs mr-2">[ANNULÉ]</span>}
            {e.title}
          </h3>
          {e.venue ? (
            <Link href={`/lieux/${e.venue.slug}`} className="flex items-center gap-1 text-xs text-fuchsia-400 hover:underline mt-1">
              <Sparkles size={11} /> {e.venue.name}{e.venue.city ? ` · ${e.venue.city}` : ''}
            </Link>
          ) : e.location ? (
            <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
              <MapPin size={11} /> {e.location}{e.city ? `, ${e.city}` : ''}
            </div>
          ) : null}
          {e.description && <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{e.description}</p>}
          {e.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {e.tags.slice(0, 4).map((t) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20">{t}</span>
              ))}
            </div>
          )}
          {e.url && (
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-fuchsia-400 hover:underline mt-2">
              Plus d'infos <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
