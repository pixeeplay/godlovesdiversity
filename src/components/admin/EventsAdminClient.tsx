'use client';
import { useEffect, useState } from 'react';
import { Calendar, Plus, Loader2, Trash2, MapPin, Eye, EyeOff, X, Save } from 'lucide-react';

type Event = {
  id: string; slug: string; title: string; description: string | null;
  startsAt: string; endsAt: string | null; location: string | null; city: string | null;
  country: string | null; address: string | null; coverImage: string | null;
  url: string | null; tags: string[]; published: boolean; cancelled: boolean;
};

const empty = (): Partial<Event> => ({
  title: '', description: '', startsAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  endsAt: '', location: '', city: '', country: 'France', url: '', tags: [], published: true, cancelled: false
});

export function EventsAdminClient() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<Event> | null>(null);
  const [saving, setSaving] = useState(false);

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
      if (!r.ok) {
        alert(`Erreur : ${j.error}`);
      } else {
        setEditing(null);
        await load();
      }
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement cet événement ?')) return;
    const r = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    if (r.ok) await load();
  }

  const upcoming = events.filter((e) => new Date(e.startsAt) >= new Date());
  const past = events.filter((e) => new Date(e.startsAt) < new Date());

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-2.5">
              <Calendar size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold">Événements</h1>
          </div>
          <p className="text-zinc-400 text-sm">Page publique : <a href="/agenda" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:underline">/agenda</a></p>
        </div>
        <button
          onClick={() => setEditing(empty())}
          className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          <Plus size={14} /> Nouvel événement
        </button>
      </header>

      {loading ? (
        <div className="text-center py-12 text-zinc-500"><Loader2 className="animate-spin inline mr-2" /> Chargement…</div>
      ) : (
        <>
          <Section title={`À venir (${upcoming.length})`} list={upcoming} onEdit={setEditing} onRemove={remove} />
          <Section title={`Passés (${past.length})`} list={past} onEdit={setEditing} onRemove={remove} faded />
        </>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h2 className="text-xl font-bold mb-4">{editing.id ? 'Modifier' : 'Créer'} l'événement</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Titre *" value={editing.title || ''} onChange={(v) => setEditing({ ...editing, title: v })} />
            <Field label="Lieu" value={editing.location || ''} onChange={(v) => setEditing({ ...editing, location: v })} placeholder="Ex: Église St-Eustache" />
            <Field label="Ville" value={editing.city || ''} onChange={(v) => setEditing({ ...editing, city: v })} />
            <Field label="Pays" value={editing.country || ''} onChange={(v) => setEditing({ ...editing, country: v })} />
            <Field label="Date début *" type="datetime-local" value={(editing.startsAt || '').slice(0, 16)} onChange={(v) => setEditing({ ...editing, startsAt: v })} />
            <Field label="Date fin" type="datetime-local" value={(editing.endsAt || '').slice(0, 16) || ''} onChange={(v) => setEditing({ ...editing, endsAt: v })} />
            <Field label="Lien (billetterie, infos)" value={editing.url || ''} onChange={(v) => setEditing({ ...editing, url: v })} placeholder="https://…" />
            <Field label="Image cover URL" value={editing.coverImage || ''} onChange={(v) => setEditing({ ...editing, coverImage: v })} />
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-zinc-400">Description</label>
            <textarea
              value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              rows={4}
              className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-fuchsia-500"
            />
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-zinc-400">Tags (séparés par virgule)</label>
            <input
              value={(editing.tags || []).join(', ')}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-fuchsia-500"
              placeholder="prière, méditation, conférence"
            />
          </div>
          <div className="mt-4 flex gap-4">
            <Toggle label="Publié" value={!!editing.published} onChange={(v) => setEditing({ ...editing, published: v })} />
            <Toggle label="Annulé" value={!!editing.cancelled} onChange={(v) => setEditing({ ...editing, cancelled: v })} />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-zinc-400 hover:text-white">Annuler</button>
            <button onClick={save} disabled={saving} className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, list, onEdit, onRemove, faded }: { title: string; list: Event[]; onEdit: (e: Event) => void; onRemove: (id: string) => void; faded?: boolean }) {
  if (list.length === 0) return null;
  return (
    <section className={faded ? 'opacity-60' : ''}>
      <h2 className="text-xs uppercase font-bold tracking-widest text-fuchsia-400 mb-3">{title}</h2>
      <div className="grid md:grid-cols-2 gap-3">
        {list.map((e) => (
          <article
            key={e.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-fuchsia-500/40 transition cursor-pointer"
            onClick={() => onEdit(e)}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-bold text-white truncate flex-1">
                {e.cancelled && <span className="text-red-400 text-xs mr-2">[ANNULÉ]</span>}
                {!e.published && <span className="text-amber-400 text-xs mr-2">[BROUILLON]</span>}
                {e.title}
              </h3>
              <button onClick={(ev) => { ev.stopPropagation(); onRemove(e.id); }} className="text-zinc-500 hover:text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="text-xs text-zinc-400">
              {new Date(e.startsAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}
            </div>
            {e.location && (
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                <MapPin size={11} /> {e.location}{e.city ? `, ${e.city}` : ''}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-fuchsia-500"
      />
    </label>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-fuchsia-500" />
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-zinc-500 hover:text-white"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}
