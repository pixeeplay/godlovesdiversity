'use client';
import { useMemo, useState } from 'react';
import { Calendar, Filter, Heart, Search, ChevronDown, ChevronRight, Globe, Sparkles } from 'lucide-react';
import { EmptyStateSeed } from './EmptyStateSeed';

interface ReligiousEvent {
  id: string;
  slug: string;
  name: string;
  faith: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
  duration: number;
  description: string | null;
  inclusivityNote: string | null;
  emoji: string | null;
  color: string | null;
}

const FAITH_META: Record<string, { label: string; emoji: string; color: string }> = {
  catholic:    { label: 'Catholicisme',     emoji: '✝️',  color: '#dc2626' },
  protestant:  { label: 'Protestantisme',   emoji: '✠',   color: '#1e40af' },
  orthodox:    { label: 'Orthodoxie',       emoji: '☦️',  color: '#7c3aed' },
  christian:   { label: 'Christianisme',    emoji: '✝️',  color: '#dc2626' },
  muslim:      { label: 'Islam',            emoji: '☪️',  color: '#059669' },
  jewish:      { label: 'Judaïsme',         emoji: '✡️',  color: '#3b82f6' },
  buddhist:    { label: 'Bouddhisme',       emoji: '☸️',  color: '#f59e0b' },
  hindu:       { label: 'Hindouisme',       emoji: '🕉️',  color: '#ec4899' },
  sikh:        { label: 'Sikhisme',         emoji: '☬',   color: '#f97316' },
  interfaith:  { label: 'Inter-religieux',  emoji: '🌍',  color: '#22d3ee' }
};

const CATEGORY_LABEL: Record<string, string> = {
  'fete-majeure':  'Fête majeure',
  'fete-mineure':  'Fête mineure',
  'jeune':         'Jeûne',
  'ramadan':       'Ramadan',
  'shabbat':       'Shabbat',
  'pelerinage':    'Pèlerinage',
  'memorial':      'Mémorial'
};

export function CalendrierReligieuxClient({ events: initial }: { events: ReligiousEvent[] }) {
  const [events] = useState<ReligiousEvent[]>(initial);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [activeFaiths, setActiveFaiths] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [showInclusiveOnly, setShowInclusiveOnly] = useState(false);

  function toggleFaith(f: string) {
    setActiveFaiths((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (activeFaiths.size > 0 && !activeFaiths.has(e.faith)) return false;
      if (showInclusiveOnly && !e.inclusivityNote) return false;
      if (q) {
        const ql = q.toLowerCase();
        if (!e.name.toLowerCase().includes(ql) && !(e.description || '').toLowerCase().includes(ql)) return false;
      }
      return true;
    });
  }, [events, activeFaiths, q, showInclusiveOnly]);

  const upcoming = filtered.filter(e => new Date(e.startsAt) >= new Date(Date.now() - 86400000));
  const past = filtered.filter(e => new Date(e.startsAt) < new Date(Date.now() - 86400000));

  const counts: Record<string, number> = {};
  for (const e of events) counts[e.faith] = (counts[e.faith] || 0) + 1;

  return (
    <main className="container-wide py-12">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-xl p-3">
            <Globe size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl">Calendrier religieux mondial</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Toutes les fêtes religieuses inclusives — 9 confessions, {events.length} événements.
            </p>
          </div>
        </div>
      </header>

      {/* Filtres confessions */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-3 flex items-center gap-1.5">
          <Filter size={11} /> Filtrer par confession
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveFaiths(new Set())}
            className={`text-xs px-3 py-1.5 rounded-full font-bold transition ${activeFaiths.size === 0 ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            Toutes ({events.length})
          </button>
          {Object.entries(FAITH_META).map(([id, meta]) => {
            if (!counts[id]) return null;
            const active = activeFaiths.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleFaith(id)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5`}
                style={{
                  backgroundColor: active ? meta.color : 'rgb(39, 39, 42)',
                  color: active ? 'white' : 'rgb(212, 212, 216)'
                }}
              >
                <span>{meta.emoji}</span> {meta.label} ({counts[id]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-zinc-950 border border-zinc-700 rounded-lg px-3">
            <Search size={12} className="text-zinc-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un événement…" className="bg-transparent flex-1 px-1 py-1.5 text-xs outline-none" />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={showInclusiveOnly} onChange={(e) => setShowInclusiveOnly(e.target.checked)} className="accent-fuchsia-500" />
            <Heart size={11} className="text-fuchsia-400" /> Avec note d'inclusivité GLD seulement
          </label>
          <div className="flex bg-zinc-950 border border-zinc-700 rounded-lg overflow-hidden ml-auto">
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs ${view === 'list' ? 'bg-fuchsia-500 text-white' : 'hover:bg-zinc-800'}`}>Liste</button>
            <button onClick={() => setView('calendar')} className={`px-3 py-1.5 text-xs ${view === 'calendar' ? 'bg-fuchsia-500 text-white' : 'hover:bg-zinc-800'}`}>Mois</button>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 mt-3 inline-block">{filtered.length} résultat(s) · {upcoming.length} à venir · {past.length} passés</span>
      </section>

      {events.length === 0 ? (
        <EmptyStateSeed
          emoji="🌍"
          title="Calendrier en cours d'initialisation"
          description="Cliquer ci-dessous pour pré-remplir 50 fêtes religieuses pour 2026 et 2027 : Christianisme (Pâques catholique/orthodoxe, Pentecôte, Noël, Avent, Réformation), Islam (Ramadan, Aïd al-Fitr, Aïd al-Adha, Mawlid, Achoura, Laylat al-Qadr), Judaïsme (Pourim, Pessah, Chavouot, Roch Hachana, Yom Kippour, Soukkot, Hanouka), Bouddhisme (Vesak, Losar, Magha Puja, Asalha Puja, Ulambana), Hindouisme (Holi, Diwali, Navratri, Ganesh, Krishna), Sikhisme (Vaisakhi, Guru Nanak), Inter-religieux."
          seedEndpoint="/api/admin/seed-religious-events"
          seedLabel="📅 Initialiser le calendrier (50 fêtes)"
        />
      ) : view === 'list' ? (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xs uppercase font-bold tracking-widest text-emerald-400 mb-3">À venir ({upcoming.length})</h2>
              <div className="grid gap-2">
                {upcoming.map(e => <EventCard key={e.id} e={e} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-3">Passés ({past.length})</h2>
              <div className="grid gap-2 opacity-60">
                {past.slice(0, 50).map(e => <EventCard key={e.id} e={e} />)}
              </div>
            </section>
          )}
        </>
      ) : (
        <CalendarMonthView events={filtered} />
      )}
    </main>
  );
}

function EventCard({ e }: { e: ReligiousEvent }) {
  const meta = FAITH_META[e.faith] || { label: e.faith, emoji: '🌐', color: '#71717a' };
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : null;
  const isMultiDay = end && (end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth());

  return (
    <article
      className="bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500/40 rounded-xl p-3 flex items-start gap-3 transition"
      style={{ borderLeftWidth: 4, borderLeftColor: e.color || meta.color }}
    >
      <div className="bg-zinc-950 rounded-lg p-2 text-center w-14 shrink-0">
        <div className="text-xl font-bold leading-none" style={{ color: e.color || meta.color }}>{start.getDate()}</div>
        <div className="text-[9px] text-zinc-500 uppercase mt-0.5">{start.toLocaleDateString('fr-FR', { month: 'short' })}</div>
        <div className="text-[8px] text-zinc-600">{start.getFullYear()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center flex-wrap gap-1.5 mb-1">
          <span className="text-xl">{e.emoji || meta.emoji}</span>
          <h3 className="font-bold text-white">{e.name}</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${e.color || meta.color}30`, color: e.color || meta.color }}>
            {meta.label}
          </span>
          <span className="text-[10px] text-zinc-500">{CATEGORY_LABEL[e.category] || e.category}</span>
          {isMultiDay && (
            <span className="text-[10px] text-zinc-400">
              · jusqu'au {end!.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ({e.duration}j)
            </span>
          )}
        </div>
        {e.description && <p className="text-xs text-zinc-300">{e.description}</p>}
        {e.inclusivityNote && (
          <div className="mt-2 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg p-2 text-[11px] text-fuchsia-200 flex items-start gap-1.5">
            <Heart size={10} className="mt-0.5 shrink-0" />
            <span><strong>Inclusivité GLD :</strong> {e.inclusivityNote}</span>
          </div>
        )}
      </div>
    </article>
  );
}

function CalendarMonthView({ events }: { events: ReligiousEvent[] }) {
  const months = useMemo(() => {
    const m: Record<string, ReligiousEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.startsAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      (m[key] = m[key] || []).push(e);
    }
    return Object.entries(m).sort();
  }, [events]);

  return (
    <div className="space-y-6">
      {months.map(([key, list]) => {
        const [yearStr, monthStr] = key.split('-');
        const month = parseInt(monthStr) - 1;
        const monthName = new Date(parseInt(yearStr), month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return (
          <section key={key} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <header className="bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-4 py-3 border-b border-zinc-800">
              <h2 className="font-bold text-base capitalize flex items-center gap-2">
                <Calendar size={14} className="text-fuchsia-400" /> {monthName}
                <span className="text-xs text-zinc-500 font-normal">· {list.length} événement{list.length > 1 ? 's' : ''}</span>
              </h2>
            </header>
            <div className="p-3 space-y-2">
              {list.map(e => <EventCard key={e.id} e={e} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
