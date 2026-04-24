'use client';
import { useState } from 'react';
import { X, Save, Loader2, Trash2, MapPin, Search } from 'lucide-react';

const PLACE_TYPES = [
  { v: '', l: '—' },
  { v: 'CHURCH', l: '⛪ Église' },
  { v: 'MOSQUE', l: '🕌 Mosquée' },
  { v: 'SYNAGOGUE', l: '✡️ Synagogue' },
  { v: 'TEMPLE', l: '🛕 Temple' },
  { v: 'PUBLIC_SPACE', l: '🌆 Espace public' },
  { v: 'OTHER', l: 'Autre' }
];

export type EditablePhoto = {
  id: string;
  url: string;
  caption: string | null;
  authorName: string | null;
  placeName: string | null;
  placeType: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  storageKey: string;
};

export function PhotoEditor({ photo, onClose, onSaved, onDeleted }: {
  photo: EditablePhoto;
  onClose: () => void;
  onSaved: (p: EditablePhoto) => void;
  onDeleted: () => void;
}) {
  const [v, setV] = useState<EditablePhoto>(photo);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  function set<K extends keyof EditablePhoto>(k: K, val: EditablePhoto[K]) {
    setV((s) => ({ ...s, [k]: val }));
  }

  async function save() {
    setBusy(true);
    const r = await fetch(`/api/admin/photos/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: v.caption,
        authorName: v.authorName,
        placeName: v.placeName,
        placeType: v.placeType,
        city: v.city,
        country: v.country,
        latitude: v.latitude,
        longitude: v.longitude,
        status: v.status
      })
    });
    setBusy(false);
    if (r.ok) {
      const j = await r.json();
      onSaved(j.photo);
      onClose();
    }
  }

  async function del() {
    if (!confirm('Supprimer définitivement cette photo ?')) return;
    const r = await fetch(`/api/admin/photos/${v.id}`, { method: 'DELETE' });
    if (r.ok) { onDeleted(); onClose(); }
  }

  // Cherche les coordonnées d'une adresse via Nominatim
  async function geocodeAddress() {
    const q = `${v.placeName || ''} ${v.city || ''} ${v.country || ''}`.trim();
    if (!q) return;
    setGeoBusy(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const j = await r.json();
      if (j[0]) {
        set('latitude', Number(j[0].lat));
        set('longitude', Number(j[0].lon));
      } else {
        alert('Adresse introuvable');
      }
    } finally { setGeoBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
         onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 flex items-center justify-between p-4 z-10">
          <h2 className="font-bold">Éditer la photo</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <div>
            {v.storageKey?.startsWith('demo/') ? (
              <div className="aspect-square rounded-xl bg-gradient-to-br from-brand-pink/30 to-purple-700/30 flex items-center justify-center text-5xl">❤️</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.url} alt="" className="rounded-xl w-full" />
            )}
            <div className="mt-3 text-xs text-zinc-500 break-all">{v.storageKey}</div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <Field label="Statut">
              <select value={v.status} onChange={(e) => set('status', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                {['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].map((x) => <option key={x}>{x}</option>)}
              </select>
            </Field>

            <Field label="Auteur affiché">
              <input value={v.authorName || ''} onChange={(e) => set('authorName', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </Field>

            <Field label="Nom du lieu">
              <input value={v.placeName || ''} onChange={(e) => set('placeName', e.target.value)}
                placeholder="Notre-Dame, Sacré-Cœur, etc."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </Field>

            <Field label="Type">
              <select value={v.placeType || ''} onChange={(e) => set('placeType', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                {PLACE_TYPES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Ville">
                <input value={v.city || ''} onChange={(e) => set('city', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              </Field>
              <Field label="Pays">
                <input value={v.country || ''} onChange={(e) => set('country', e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              </Field>
            </div>

            <div className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end">
              <Field label="Latitude">
                <input value={v.latitude ?? ''} onChange={(e) => set('latitude', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
              </Field>
              <Field label="Longitude">
                <input value={v.longitude ?? ''} onChange={(e) => set('longitude', e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
              </Field>
              <button
                onClick={geocodeAddress}
                disabled={geoBusy}
                className="btn-ghost text-xs h-[38px] px-3"
                title="Trouver les coordonnées d'après le nom + ville + pays"
              >
                {geoBusy ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
              </button>
            </div>

            <Field label="Légende / témoignage">
              <textarea value={v.caption || ''} onChange={(e) => set('caption', e.target.value)} rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </Field>
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4 flex items-center justify-between sticky bottom-0 bg-zinc-900/95 backdrop-blur">
          <button onClick={del} className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1">
            <Trash2 size={14} /> Supprimer
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
            <button onClick={save} disabled={busy} className="btn-primary text-sm">
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-zinc-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
