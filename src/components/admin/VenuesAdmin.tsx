'use client';
import { useState } from 'react';
import { Heart, Plus, Loader2, MapPin, Trash2, Save, X, Calendar, Tag, Star } from 'lucide-react';

const TYPES = ['RESTAURANT','BAR','CAFE','CLUB','HOTEL','SHOP','CULTURAL','CHURCH','TEMPLE','COMMUNITY_CENTER','HEALTH','ASSOCIATION','OTHER'];
const RATINGS = [
  { v: 'RAINBOW', label: '🏳️‍🌈 100% LGBT' },
  { v: 'FRIENDLY', label: '✨ Friendly' },
  { v: 'NEUTRAL', label: '⚪ Neutral' },
  { v: 'CAUTION', label: '⚠️ À approfondir' }
];

const empty = (): any => ({
  type: 'RESTAURANT', rating: 'FRIENDLY', name: '', shortDescription: '', description: '',
  address: '', city: '', country: 'France', lat: '', lng: '', phone: '', email: '', website: '',
  coverImage: '', tags: [], instagram: '', facebook: '', published: true, featured: false, verified: false
});

export function VenuesAdmin({ initial }: { initial: any[] }) {
  const [venues, setVenues] = useState<any[]>(initial);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  async function save() {
    if (!editing.name || !editing.type) { alert('Nom et type obligatoires'); return; }
    setSaving(true);
    try {
      const data = {
        ...editing,
        lat: editing.lat ? Number(editing.lat) : null,
        lng: editing.lng ? Number(editing.lng) : null,
        tags: typeof editing.tags === 'string' ? editing.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : editing.tags
      };
      const url = editing.id ? `/api/admin/venues/${editing.id}` : '/api/admin/venues';
      const method = editing.id ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (r.ok) {
        if (editing.id) setVenues(venues.map((v) => v.id === editing.id ? j.venue : v));
        else setVenues([j.venue, ...venues]);
        setEditing(null);
      } else alert(`Erreur : ${j.error}`);
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce lieu et ses événements liés ?')) return;
    const r = await fetch(`/api/admin/venues/${id}`, { method: 'DELETE' });
    if (r.ok) setVenues(venues.filter((v) => v.id !== id));
  }

  const filtered = filter === 'all' ? venues : venues.filter((v) => v.type === filter);

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 rounded-xl p-2.5">
              <Heart size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold">Lieux LGBTQ+</h1>
          </div>
          <p className="text-zinc-400 text-sm">Page publique : <a href="/lieux" className="text-pink-400 hover:underline">/lieux</a></p>
        </div>
        <button onClick={() => setEditing(empty())} className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <Plus size={14} /> Nouveau lieu
        </button>
      </header>

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full text-xs font-bold ${filter === 'all' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>Tous ({venues.length})</button>
        {TYPES.map((t) => {
          const n = venues.filter((v) => v.type === t).length;
          if (!n) return null;
          return <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-xs ${filter === t ? 'bg-pink-500 text-white font-bold' : 'bg-zinc-800 text-zinc-300'}`}>{t} ({n})</button>;
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <Heart size={32} className="mx-auto mb-2 opacity-30" />
          Aucun lieu pour le moment. Crée le premier !
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((v) => (
            <article key={v.id} onClick={() => setEditing(v)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-pink-500/40 cursor-pointer">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {v.featured && <Star size={12} className="text-amber-400" />}
                    <h3 className="font-bold text-white truncate">{v.name}</h3>
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase">{v.type} · {v.rating}</div>
                  {(v.city || v.country) && <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1"><MapPin size={11} /> {v.city}, {v.country}</div>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${v.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-700 text-zinc-400'}`}>
                  {v.published ? '● live' : 'draft'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
                <span className="flex items-center gap-1"><Calendar size={10} /> {v._count?.events || 0} events</span>
                <span className="flex items-center gap-1"><Tag size={10} /> {v._count?.coupons || 0} codes</span>
                <span className="ml-auto">👁 {v.views || 0}</span>
                <button onClick={(e) => { e.stopPropagation(); remove(v.id); }} className="text-zinc-500 hover:text-red-400"><Trash2 size={11} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h2 className="text-xl font-bold mb-4">{editing.id ? 'Modifier' : 'Créer'} un lieu</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Nom *" v={editing.name} on={(x) => setEditing({ ...editing, name: x })} />
            <div className="grid grid-cols-2 gap-2">
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm">
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <select value={editing.rating} onChange={(e) => setEditing({ ...editing, rating: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm">
                {RATINGS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
              </select>
            </div>
            <Field label="Adresse" v={editing.address} on={(x) => setEditing({ ...editing, address: x })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ville" v={editing.city} on={(x) => setEditing({ ...editing, city: x })} />
              <Field label="Pays" v={editing.country} on={(x) => setEditing({ ...editing, country: x })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" v={editing.lat || ''} on={(x) => setEditing({ ...editing, lat: x })} placeholder="48.8566" />
              <Field label="Longitude" v={editing.lng || ''} on={(x) => setEditing({ ...editing, lng: x })} placeholder="2.3522" />
            </div>
            <Field label="Téléphone" v={editing.phone || ''} on={(x) => setEditing({ ...editing, phone: x })} />
            <Field label="Email" v={editing.email || ''} on={(x) => setEditing({ ...editing, email: x })} />
            <Field label="Site web" v={editing.website || ''} on={(x) => setEditing({ ...editing, website: x })} />
            <Field label="Image cover URL" v={editing.coverImage || ''} on={(x) => setEditing({ ...editing, coverImage: x })} />
            <Field label="Instagram (@handle)" v={editing.instagram || ''} on={(x) => setEditing({ ...editing, instagram: x })} />
            <Field label="Facebook URL" v={editing.facebook || ''} on={(x) => setEditing({ ...editing, facebook: x })} />
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-zinc-400">Description courte (carte)</label>
            <input value={editing.shortDescription || ''} onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" maxLength={150} />
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-zinc-400">Description complète</label>
            <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={4} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <label className="text-xs font-bold uppercase text-zinc-400">Tags (séparés par virgule)</label>
            <input value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags || ''} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" placeholder="happy-hour, drag-show, brunch" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Toggle label="Publié" v={editing.published} on={(x) => setEditing({ ...editing, published: x })} />
            <Toggle label="Mis en avant" v={editing.featured} on={(x) => setEditing({ ...editing, featured: x })} />
            <Toggle label="Vérifié" v={editing.verified} on={(x) => setEditing({ ...editing, verified: x })} />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-4 py-2 text-zinc-400 hover:text-white">Annuler</button>
            <button onClick={save} disabled={saving} className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, v, on, placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-zinc-400">{label}</span>
      <input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
    </label>
  );
}

function Toggle({ label, v, on }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="w-4 h-4 accent-pink-500" />
      {label}
    </label>
  );
}

function Modal({ children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="float-right text-zinc-500 hover:text-white"><X size={20} /></button>
        {children}
      </div>
    </div>
  );
}
