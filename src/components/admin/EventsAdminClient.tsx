'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Plus, Loader2, Trash2, MapPin, Eye, EyeOff, X, Save,
  ChevronLeft, ChevronRight, List, CalendarDays, CalendarRange, Grid3x3,
  Filter, Search, Sparkles
} from 'lucide-react';

type EventItem = {
  id: string; slug: string; title: string; description: string | null;
  startsAt: string; endsAt: string | null; location: string | null; city: string | null;
  country: string | null; address: string | null; coverImage: string | null;
  url: string | null; tags: string[]; published: boolean; cancelled: boolean;
  venueId?: string | null; venue?: { id: string; name: string; slug: string } | null;
  externalSource?: string | null;
};

type View = 'day' | 'week' | 'month' | 'year' | 'list';

const empty = (date?: Date): Partial<EventItem> => ({
  title: '',
  description: '',
  startsAt: (date || new Date(Date.now() + 7 * 86400000)).toISOString().slice(0, 16),
  endsAt: '',
  location: '',
  city: '',
  country: 'France',
  url: '',
  tags: [],
  published: true,
  cancelled: false
});

export function EventsAdminClient() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<EventItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const [view, setView] = useState<View>('month');
  const [refDate, setRefDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'cancelled'>('all');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/events');
      const j = await r.json();
      if (r.ok) setEvents(j.events || []);
    } finally { setLoading(false); }
  }

  async function save() {
    if (!editing?.title || !editing.startsAt) {
      alert('Titre + date de début obligatoires');
      return;
    }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? '/api/admin/events' : `/api/admin/events/${editing.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing)
      });
      const j = await r.json();
      if (!r.ok) alert(`Erreur : ${j.error}`);
      else { setEditing(null); await load(); }
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement cet événement ?')) return;
    const r = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (r.ok) await load();
  }

  async function toggle(id: string, field: 'published' | 'cancelled', val: boolean) {
    await fetch(`/api/admin/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: val }) });
    await load();
  }

  // Filtrage global appliqué à toutes les vues
  const filtered = useMemo(() => events.filter(e => {
    if (filterStatus === 'published' && !e.published) return false;
    if (filterStatus === 'draft' && e.published) return false;
    if (filterStatus === 'cancelled' && !e.cancelled) return false;
    if (search) {
      const ql = search.toLowerCase();
      if (!e.title.toLowerCase().includes(ql) && !(e.description?.toLowerCase().includes(ql)) && !(e.location?.toLowerCase().includes(ql)) && !(e.city?.toLowerCase().includes(ql))) return false;
    }
    return true;
  }), [events, filterStatus, search]);

  const counts = useMemo(() => ({
    total: events.length,
    published: events.filter(e => e.published && !e.cancelled).length,
    draft: events.filter(e => !e.published).length,
    cancelled: events.filter(e => e.cancelled).length
  }), [events]);

  // Navigation
  function navigate(dir: -1 | 0 | 1) {
    if (dir === 0) { setRefDate(new Date()); return; }
    const d = new Date(refDate);
    if (view === 'day')   d.setDate(d.getDate() + dir);
    if (view === 'week')  d.setDate(d.getDate() + 7 * dir);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    if (view === 'year')  d.setFullYear(d.getFullYear() + dir);
    setRefDate(d);
  }

  const refLabel = useMemo(() => {
    if (view === 'day')   return refDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'week') {
      const monday = new Date(refDate);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (view === 'month') return refDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    if (view === 'year')  return String(refDate.getFullYear());
    return 'Tous les événements';
  }, [view, refDate]);

  return (
    <div className="p-6 md:p-8 max-w-[1400px] space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-2.5">
            <Calendar size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold leading-none">Agenda</h1>
            <div className="text-[11px] text-zinc-500 mt-0.5">{counts.total} événements · {counts.published} publiés · {counts.draft} brouillons · {counts.cancelled} annulés</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(empty(refDate))}
            className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5"
          >
            <Plus size={12} /> Nouvel événement
          </button>
        </div>
      </header>

      {/* Toolbar : vues + nav + filtres */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between flex-wrap gap-3">
        {/* Switch vues style macOS */}
        <div className="flex bg-zinc-950 border border-zinc-800 rounded-full p-1">
          <ViewBtn label="Jour" Icon={CalendarDays} active={view === 'day'} onClick={() => setView('day')} />
          <ViewBtn label="Semaine" Icon={CalendarRange} active={view === 'week'} onClick={() => setView('week')} />
          <ViewBtn label="Mois" Icon={Grid3x3} active={view === 'month'} onClick={() => setView('month')} />
          <ViewBtn label="Année" Icon={Calendar} active={view === 'year'} onClick={() => setView('year')} />
          <ViewBtn label="Liste" Icon={List} active={view === 'list'} onClick={() => setView('list')} />
        </div>

        {view !== 'list' && (
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-full p-1.5">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => navigate(0)} className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-full px-3 py-1 text-xs">
              Aujourd'hui
            </button>
            <button onClick={() => navigate(1)} className="bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-full p-1.5">
              <ChevronRight size={14} />
            </button>
            <span className="ml-2 text-sm font-bold capitalize">{refLabel}</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-[200px] sm:max-w-[400px]">
          <div className="flex items-center gap-1.5 flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2">
            <Search size={12} className="text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="bg-transparent flex-1 px-1 py-1.5 text-xs outline-none" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs">
            <option value="all">Tous ({counts.total})</option>
            <option value="published">Publiés ({counts.published})</option>
            <option value="draft">Brouillons ({counts.draft})</option>
            <option value="cancelled">Annulés ({counts.cancelled})</option>
          </select>
        </div>
      </div>

      {/* Vue active */}
      {loading ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <Loader2 className="animate-spin inline-block mr-2" size={16} /> Chargement…
        </div>
      ) : (
        <>
          {view === 'day'   && <DayView   events={filtered} date={refDate} onClickEvent={setEditing} onClickSlot={(d) => setEditing(empty(d))} />}
          {view === 'week'  && <WeekView  events={filtered} date={refDate} onClickEvent={setEditing} onClickSlot={(d) => setEditing(empty(d))} />}
          {view === 'month' && <MonthView events={filtered} date={refDate} onClickEvent={setEditing} onClickSlot={(d) => setEditing(empty(d))} onChangeView={(d) => { setRefDate(d); setView('day'); }} />}
          {view === 'year'  && <YearView  events={filtered} date={refDate} onClickMonth={(d) => { setRefDate(d); setView('month'); }} />}
          {view === 'list'  && <ListView  events={filtered} onEdit={setEditing} onDelete={remove} onToggle={toggle} />}
        </>
      )}

      {/* Modale édition */}
      {editing && <EditModal value={editing} onChange={setEditing} onSave={save} onClose={() => setEditing(null)} saving={saving} onDelete={editing.id ? () => { remove(editing.id!); setEditing(null); } : undefined} />}
    </div>
  );
}

function ViewBtn({ label, Icon, active, onClick }: { label: string; Icon: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ${active ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}
    >
      <Icon size={11} /> {label}
    </button>
  );
}

/* ================= DAY VIEW (timeline horaire) ================= */

function DayView({ events, date, onClickEvent, onClickSlot }: { events: EventItem[]; date: Date; onClickEvent: (e: any) => void; onClickSlot: (d: Date) => void }) {
  const dayEvents = events.filter(e => sameDay(new Date(e.startsAt), date)).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[60px_1fr] divide-x divide-zinc-800">
        <div>
          {hours.map(h => (
            <div key={h} className="h-12 text-[10px] text-zinc-500 text-right pr-2 pt-0.5">{String(h).padStart(2, '0')}:00</div>
          ))}
        </div>
        <div className="relative">
          {hours.map(h => (
            <div
              key={h}
              onClick={() => { const d = new Date(date); d.setHours(h, 0, 0, 0); onClickSlot(d); }}
              className="h-12 border-b border-zinc-800 hover:bg-zinc-800/30 cursor-pointer"
            />
          ))}
          {dayEvents.map(e => {
            const start = new Date(e.startsAt);
            const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + 60 * 60 * 1000);
            const top = (start.getHours() + start.getMinutes() / 60) * 48;
            const height = Math.max(24, ((end.getTime() - start.getTime()) / 3600000) * 48);
            return (
              <div
                key={e.id}
                onClick={() => onClickEvent(e)}
                className={`absolute left-2 right-2 rounded-lg p-2 text-xs cursor-pointer overflow-hidden ${e.cancelled ? 'bg-red-500/20 line-through' : e.published ? 'bg-fuchsia-500/30 hover:bg-fuchsia-500/40' : 'bg-amber-500/20 hover:bg-amber-500/30'}`}
                style={{ top, height }}
              >
                <div className="font-bold truncate">{e.title}</div>
                <div className="text-[10px] opacity-80 truncate">
                  {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  {e.location && ` · ${e.location}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= WEEK VIEW ================= */

function WeekView({ events, date, onClickEvent, onClickSlot }: { events: EventItem[]; date: Date; onClickEvent: (e: any) => void; onClickSlot: (d: Date) => void }) {
  const monday = new Date(date);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(d.getDate() + i); return d; });
  const today = new Date();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 divide-x divide-zinc-800">
        {days.map(d => {
          const dEvents = events.filter(e => sameDay(new Date(e.startsAt), d)).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          const isToday = sameDay(d, today);
          return (
            <div key={d.toISOString()} className="min-h-[400px]">
              <div className={`p-2 text-center border-b border-zinc-800 ${isToday ? 'bg-fuchsia-500/10' : ''}`}>
                <div className="text-[10px] uppercase text-zinc-500 font-bold">{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                <div className={`text-lg font-bold ${isToday ? 'text-fuchsia-300' : ''}`}>{d.getDate()}</div>
              </div>
              <div onClick={() => { const x = new Date(d); x.setHours(12); onClickSlot(x); }} className="p-1 space-y-1 cursor-pointer min-h-[350px]">
                {dEvents.map(e => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onClickEvent(e); }}
                    className={`text-[10px] px-1.5 py-1 rounded truncate cursor-pointer ${e.cancelled ? 'bg-red-500/20 text-red-300 line-through' : e.published ? 'bg-fuchsia-500/30 text-fuchsia-100 hover:bg-fuchsia-500/40' : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'}`}
                  >
                    <div className="font-bold">{new Date(e.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="truncate">{e.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= MONTH VIEW ================= */

function MonthView({ events, date, onClickEvent, onClickSlot, onChangeView }: { events: EventItem[]; date: Date; onClickEvent: (e: any) => void; onClickSlot: (d: Date) => void; onChangeView: (d: Date) => void }) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: Array<{ date?: Date }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({});
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
  // padding pour 6 lignes max
  while (cells.length % 7 !== 0) cells.push({});

  const today = new Date();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(d => (
          <div key={d} className="text-[10px] uppercase text-zinc-500 font-bold text-center py-2">{d}.</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((c, i) => {
          if (!c.date) return <div key={i} className="min-h-[120px] border-r border-b border-zinc-800/50 last:border-r-0" />;
          const dEvents = events.filter(e => sameDay(new Date(e.startsAt), c.date!)).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          const isToday = sameDay(c.date, today);
          return (
            <div
              key={i}
              onClick={() => { const x = new Date(c.date!); x.setHours(12); onClickSlot(x); }}
              className={`min-h-[120px] p-1.5 border-r border-b border-zinc-800/50 last:border-r-0 cursor-pointer hover:bg-zinc-800/20 ${isToday ? 'bg-fuchsia-500/5' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onChangeView(c.date!); }}
                  className={`text-[11px] font-bold ${isToday ? 'bg-fuchsia-500 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-zinc-400 hover:text-white'}`}
                >
                  {c.date.getDate()}
                </button>
              </div>
              <div className="space-y-0.5">
                {dEvents.slice(0, 3).map(e => (
                  <div
                    key={e.id}
                    onClick={(ev) => { ev.stopPropagation(); onClickEvent(e); }}
                    className={`text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer ${e.cancelled ? 'bg-red-500/20 text-red-300 line-through' : e.published ? 'bg-fuchsia-500/25 text-fuchsia-100 hover:bg-fuchsia-500/40' : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'}`}
                    title={`${e.title} — ${e.location || ''}`}
                  >
                    <span className="font-bold">{new Date(e.startsAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span> {e.title}
                  </div>
                ))}
                {dEvents.length > 3 && (
                  <div className="text-[9px] text-zinc-500 px-1">+{dEvents.length - 3} autres</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= YEAR VIEW (12 mini-mois) ================= */

function YearView({ events, date, onClickMonth }: { events: EventItem[]; date: Date; onClickMonth: (d: Date) => void }) {
  const year = date.getFullYear();
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));
  const today = new Date();

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {months.map(m => {
        const monthEvents = events.filter(e => {
          const ed = new Date(e.startsAt);
          return ed.getFullYear() === year && ed.getMonth() === m.getMonth();
        });
        const firstDay = new Date(year, m.getMonth(), 1);
        const lastDay = new Date(year, m.getMonth() + 1, 0);
        const startWeekday = (firstDay.getDay() + 6) % 7;
        const daysInMonth = lastDay.getDate();

        return (
          <div
            key={m.toISOString()}
            onClick={() => onClickMonth(m)}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 cursor-pointer hover:border-fuchsia-500/40 transition"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold capitalize text-sm">{m.toLocaleDateString('fr-FR', { month: 'long' })}</h3>
              <span className="text-[10px] text-fuchsia-400 font-bold">{monthEvents.length} évén.</span>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} className="text-[8px] text-zinc-600 text-center">{d}</div>
              ))}
              {Array.from({ length: startWeekday }, (_, i) => <div key={'p' + i} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dDate = new Date(year, m.getMonth(), day);
                const hasEvent = monthEvents.some(e => sameDay(new Date(e.startsAt), dDate));
                const isToday = sameDay(dDate, today);
                return (
                  <div
                    key={day}
                    className={`text-[9px] text-center py-0.5 rounded ${
                      isToday ? 'bg-fuchsia-500 text-white font-bold' :
                      hasEvent ? 'text-fuchsia-300 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================= LIST VIEW ================= */

function ListView({ events, onEdit, onDelete, onToggle }: { events: EventItem[]; onEdit: (e: any) => void; onDelete: (id: string) => void; onToggle: (id: string, f: 'published' | 'cancelled', v: boolean) => void }) {
  const sorted = [...events].sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  const today = new Date();
  const upcoming = sorted.filter(e => new Date(e.startsAt) >= today).reverse();
  const past = sorted.filter(e => new Date(e.startsAt) < today);

  if (events.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
        <Calendar size={32} className="mx-auto mb-2 opacity-30" /> Aucun événement.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">À venir ({upcoming.length})</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800">
            {upcoming.map(e => <Row key={e.id} e={e} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Passés ({past.length})</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl divide-y divide-zinc-800 opacity-70">
            {past.map(e => <Row key={e.id} e={e} onEdit={onEdit} onDelete={onDelete} onToggle={onToggle} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ e, onEdit, onDelete, onToggle }: { e: EventItem; onEdit: (x: any) => void; onDelete: (id: string) => void; onToggle: (id: string, f: 'published' | 'cancelled', v: boolean) => void }) {
  const start = new Date(e.startsAt);
  return (
    <div className={`p-3 flex items-center gap-3 hover:bg-zinc-800/30 transition ${e.cancelled ? 'opacity-50' : ''}`}>
      <div className="w-12 text-center bg-zinc-950 rounded-lg p-1.5 border border-zinc-800 shrink-0">
        <div className={`text-lg font-bold leading-none ${e.cancelled ? 'text-red-400' : 'text-fuchsia-400'}`}>{start.getDate()}</div>
        <div className="text-[9px] text-zinc-400 uppercase mt-0.5">{start.toLocaleDateString('fr-FR', { month: 'short' })}</div>
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(e)}>
        <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
          {e.cancelled && <span className="text-red-400 text-xs">[ANNULÉ]</span>}
          <span className="truncate">{e.title}</span>
          {e.externalSource && <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">{e.externalSource}</span>}
        </div>
        <div className="text-[10px] text-zinc-500 flex items-center gap-2 flex-wrap mt-0.5">
          <span>{start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          {e.venue && <span className="text-violet-400">{e.venue.name}</span>}
          {(e.location || e.city) && <span className="flex items-center gap-0.5"><MapPin size={9} /> {e.location || e.city}{e.city && e.location ? `, ${e.city}` : ''}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onToggle(e.id, 'published', !e.published)} className={`text-[10px] px-2 py-1 rounded-full ${e.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`} title={e.published ? 'Dépublier' : 'Publier'}>
          {e.published ? <Eye size={10} /> : <EyeOff size={10} />}
        </button>
        <button onClick={() => onEdit(e)} className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 p-1.5 rounded-full" title="Modifier">
          <Save size={11} />
        </button>
        <button onClick={() => onDelete(e.id)} className="text-zinc-500 hover:text-red-400 p-1.5" title="Supprimer">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

/* ================= MODALE ÉDITION ================= */

function EditModal({ value, onChange, onSave, onClose, saving, onDelete }: { value: Partial<EventItem>; onChange: (v: any) => void; onSave: () => void; onClose: () => void; saving: boolean; onDelete?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-fuchsia-400" />
            <h3 className="font-bold">{value.id ? 'Modifier l\'événement' : 'Nouvel événement'}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="Titre *">
            <input value={value.title || ''} onChange={(e) => onChange({ ...value, title: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Date début *">
              <input type="datetime-local" value={(value.startsAt || '').slice(0, 16)} onChange={(e) => onChange({ ...value, startsAt: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
            </Field>
            <Field label="Date fin (optionnel)">
              <input type="datetime-local" value={(value.endsAt || '').slice(0, 16)} onChange={(e) => onChange({ ...value, endsAt: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Lieu">
              <input value={value.location || ''} onChange={(e) => onChange({ ...value, location: e.target.value })} placeholder="Église St-Eustache" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
            </Field>
            <Field label="Ville">
              <input value={value.city || ''} onChange={(e) => onChange({ ...value, city: e.target.value })} placeholder="Paris" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={value.description || ''} onChange={(e) => onChange({ ...value, description: e.target.value })} rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          </Field>
          <Field label="URL (billetterie / infos)">
            <input value={value.url || ''} onChange={(e) => onChange({ ...value, url: e.target.value })} placeholder="https://…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
          </Field>
          <Field label="Tags (séparés par virgule)">
            <input
              value={Array.isArray(value.tags) ? value.tags.join(', ') : ''}
              onChange={(e) => onChange({ ...value, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
              placeholder="prière, drag, gratuit"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!value.published} onChange={(e) => onChange({ ...value, published: e.target.checked })} />
              Publié sur l'agenda public
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!value.cancelled} onChange={(e) => onChange({ ...value, cancelled: e.target.checked })} />
              <span className="text-red-300">Annulé</span>
            </label>
          </div>
        </div>
        <footer className="p-4 border-t border-zinc-800 flex items-center gap-2">
          <button onClick={onSave} disabled={saving || !value.title || !value.startsAt} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {value.id ? 'Enregistrer' : 'Créer'}
          </button>
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Annuler</button>
          {onDelete && (
            <button onClick={onDelete} className="ml-auto text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
              <Trash2 size={12} /> Supprimer
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
