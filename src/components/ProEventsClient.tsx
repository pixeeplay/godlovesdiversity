'use client';
import { useState } from 'react';
import { Plus, Loader2, Save, Trash2, Edit3, X, Calendar, MapPin, ExternalLink, Sparkles, Globe } from 'lucide-react';

type Venue = { id: string; name: string; slug: string };
type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  city?: string | null;
  url?: string | null;
  tags: string[];
  published: boolean;
  cancelled: boolean;
  venueId?: string | null;
};

const EMPTY = {
  venueId: '',
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  location: '',
  city: '',
  url: '',
  tags: ''
};

export function ProEventsClient({ venues, initialEvents }: { venues: Venue[]; initialEvents: EventItem[] }) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY, venueId: venues[0]?.id || '' });

  function reset() {
    setForm({ ...EMPTY, venueId: venues[0]?.id || '' });
    setEditingId(null);
    setShowForm(false);
  }

  async function save() {
    if (!form.venueId || !form.title || !form.startsAt) {
      alert('Lieu + titre + date de début requis');
      return;
    }
    setBusy('save');
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean)
      };
      const url = editingId ? `/api/pro/events/${editingId}` : '/api/pro/events';
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (r.ok && j.event) {
        if (editingId) setEvents(events.map(e => e.id === j.event.id ? j.event : e));
        else setEvents([j.event, ...events]);
        reset();
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  function startEdit(e: EventItem) {
    setEditingId(e.id);
    setForm({
      venueId: e.venueId || venues[0]?.id || '',
      title: e.title,
      description: e.description || '',
      startsAt: new Date(e.startsAt).toISOString().slice(0, 16),
      endsAt: e.endsAt ? new Date(e.endsAt).toISOString().slice(0, 16) : '',
      location: e.location || '',
      city: e.city || '',
      url: e.url || '',
      tags: (e.tags || []).join(', ')
    });
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement cet événement ?')) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/pro/events/${id}`, { method: 'DELETE' });
      if (r.ok) setEvents(events.filter(e => e.id !== id));
      else { const j = await r.json(); alert(`Erreur : ${j.error}`); }
    } finally { setBusy(null); }
  }

  async function toggle(id: string, field: 'published' | 'cancelled', val: boolean) {
    setBusy(id);
    try {
      const r = await fetch(`/api/pro/events/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: val })
      });
      const j = await r.json();
      if (r.ok && j.event) setEvents(events.map(e => e.id === id ? j.event : e));
    } finally { setBusy(null); }
  }

  const upcoming = events.filter(e => new Date(e.startsAt) >= new Date());
  const past = events.filter(e => new Date(e.startsAt) < new Date());

  // Seeder enrichissement événements monde
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  async function enrichWorldEvents() {
    if (!confirm('Enrichir l\'agenda avec ~85 événements connus dans le monde (Prides 2026, journées mondiales LGBT, fêtes religieuses) ?\n\nIdempotent : les événements déjà présents seront skippés.')) return;
    setSeedBusy(true); setSeedMsg(null);
    try {
      const r = await fetch('/api/admin/seed-world-events', { method: 'POST' });
      const j = await r.json();
      if (r.ok) {
        setSeedMsg(`✅ ${j.message}`);
        setTimeout(() => window.location.reload(), 1800);
      } else {
        setSeedMsg(`⚠ ${j.error || 'Échec'}`);
      }
    } catch (e: any) {
      setSeedMsg(`⚠ ${e.message}`);
    }
    setSeedBusy(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400">
          Mes événements ({events.length})
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={enrichWorldEvents}
            disabled={seedBusy}
            className="bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 hover:from-violet-500/40 hover:to-fuchsia-500/40 border border-violet-500/40 text-violet-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 disabled:opacity-50"
            title="Pré-remplit avec Prides 2026, journées LGBT, fêtes religieuses"
          >
            {seedBusy ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
            🌍 Enrichir agenda mondial (~85 événements)
          </button>
          <button onClick={() => { reset(); setShowForm(!showForm); }} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Plus size={12} /> {showForm ? 'Annuler' : 'Nouvel événement'}
          </button>
        </div>
      </div>
      {seedMsg && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 mb-3 text-sm text-violet-200">
          {seedMsg}
        </div>
      )}

      {showForm && (
        <div className="bg-zinc-900 border-2 border-fuchsia-500/30 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-3 text-sm flex items-center gap-2">
            {editingId ? <><Edit3 size={14} /> Modifier l'événement</> : <><Plus size={14} /> Nouvel événement</>}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Lieu *</label>
              <select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1">
                {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Titre *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="ex: Soirée karaoké drag-friendly" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Début *</label>
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Fin (optionnel)</label>
              <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Lieu/salle (sinon adresse du venue)</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="ex: Salle du fond, terrasse…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Ville (override)</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Programme, intervenants, ambiance…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">URL billetterie / infos</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Tags (séparés par virgule)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="drag, karaoké, gratuit" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={busy === 'save'} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button onClick={reset} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-full">Annuler</button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-sm">
          <Calendar size={32} className="mx-auto mb-2 opacity-30" />
          Aucun événement. Crée-en un pour qu'il apparaisse sur l'agenda public et la fiche de ton lieu.
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.length > 0 && (
            <>
              <h3 className="text-[11px] uppercase text-zinc-500 font-bold mt-4">À venir</h3>
              {upcoming.map(e => <EventRow key={e.id} e={e} venues={venues} busy={busy} onEdit={startEdit} onDelete={remove} onToggle={toggle} />)}
            </>
          )}
          {past.length > 0 && (
            <>
              <h3 className="text-[11px] uppercase text-zinc-500 font-bold mt-6">Passés</h3>
              {past.map(e => <EventRow key={e.id} e={e} venues={venues} busy={busy} onEdit={startEdit} onDelete={remove} onToggle={toggle} />)}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function EventRow({ e, venues, busy, onEdit, onDelete, onToggle }: {
  e: EventItem; venues: Venue[]; busy: string | null;
  onEdit: (e: EventItem) => void; onDelete: (id: string) => void;
  onToggle: (id: string, f: 'published' | 'cancelled', v: boolean) => void;
}) {
  const v = venues.find(v => v.id === e.venueId);
  const start = new Date(e.startsAt);
  const end = (e as any).endsAt ? new Date((e as any).endsAt) : null;
  const tags: string[] = Array.isArray((e as any).tags) ? (e as any).tags : [];
  const externalSource = (e as any).externalSource as string | undefined;
  const isSeed = externalSource === 'gld-seed';
  const description = (e as any).description as string | undefined;
  const country = (e as any).country as string | undefined;
  const venueId = e.venueId;

  // Lien vers l'agenda public (si publié)
  const publicLink = e.published ? `/agenda#event-${e.id}` : null;

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 ${e.cancelled ? 'opacity-60' : ''} hover:border-zinc-700 transition`}>
      <div className="flex items-start gap-3">
        {/* Date */}
        <div className="w-14 text-center bg-zinc-950 rounded-lg p-2 border border-zinc-800 shrink-0">
          <div className="text-xl font-bold text-fuchsia-400 leading-none">{start.getDate()}</div>
          <div className="text-[10px] text-zinc-400 uppercase mt-1">{start.toLocaleDateString('fr-FR', { month: 'short' })}</div>
          <div className="text-[9px] text-zinc-600 mt-0.5">{start.getFullYear()}</div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {e.cancelled && <span className="text-rose-400 text-[10px] font-bold bg-rose-500/10 px-1.5 py-0.5 rounded">ANNULÉ</span>}
            {isSeed && <span className="text-violet-300 text-[10px] font-bold bg-violet-500/15 px-1.5 py-0.5 rounded" title="Importé depuis le seed mondial">🌍 SEED</span>}
            {externalSource === 'facebook' && <span className="text-blue-300 text-[10px] font-bold bg-blue-500/15 px-1.5 py-0.5 rounded">📘 FB</span>}
            <h4 className="font-bold text-sm">{e.title}</h4>
          </div>

          {/* Description (1ʳᵉ ligne) */}
          {description && (
            <p className="text-xs text-zinc-300 line-clamp-2 mb-2">{description}</p>
          )}

          {/* Meta */}
          <div className="text-[11px] text-zinc-500 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-0.5">
              🕒 {start.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {end && (start.getDate() !== end.getDate() || start.getMonth() !== end.getMonth())
                ? <span className="ml-1 text-amber-400">→ {end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                : null}
            </span>
            {v && <span className="text-violet-400 font-bold">📍 {v.name}</span>}
            {e.city && <span className="flex items-center gap-0.5"><MapPin size={10} /> {e.city}{country ? `, ${country}` : ''}</span>}
            {!v && country && !e.city && <span className="flex items-center gap-0.5"><Globe size={10} /> {country}</span>}
            <span className={e.published ? 'text-emerald-400' : 'text-amber-400'}>
              ● {e.published ? 'publié' : 'brouillon'}
            </span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 6).map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/20">
                  {t}
                </span>
              ))}
              {tags.length > 6 && <span className="text-[9px] text-zinc-500">+{tags.length - 6}</span>}
            </div>
          )}

          {/* Liens utiles */}
          <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1">
                <ExternalLink size={10} /> Site / billetterie
              </a>
            )}
            {publicLink && (
              <a href={publicLink} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1">
                <ExternalLink size={10} /> Voir sur agenda public
              </a>
            )}
            {v && (
              <a href={`/lieux/${(v as any).slug || v.id}`} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline flex items-center gap-1">
                <ExternalLink size={10} /> Fiche lieu
              </a>
            )}
            {venueId == null && country && (
              <span className="text-[10px] text-zinc-600 italic">⚠ Pas attaché à un venue (event global)</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={() => onToggle(e.id, 'published', !e.published)} disabled={busy === e.id} className="text-[10px] px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 whitespace-nowrap">
            {e.published ? 'Dépublier' : 'Publier'}
          </button>
          {!e.cancelled && (
            <button onClick={() => onToggle(e.id, 'cancelled', true)} disabled={busy === e.id} className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 whitespace-nowrap">
              Annuler
            </button>
          )}
          <div className="flex gap-1 justify-end">
            <button onClick={() => onEdit(e)} className="bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 p-1.5 rounded-full" title="Modifier">
              <Edit3 size={11} />
            </button>
            <button onClick={() => onDelete(e.id)} disabled={busy === e.id} className="text-zinc-500 hover:text-red-400 p-1.5" title="Supprimer">
              {busy === e.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
