'use client';
import { useState, useRef } from 'react';
import { UploadCloud, Loader2, Trash2, FileText, Eye, EyeOff, Plus, X, Pencil, Save } from 'lucide-react';

type Poster = {
  id: string;
  title: string;
  description: string | null;
  format: string;
  size: string | null;
  order: number;
  published: boolean;
  downloads: number;
  fileKey: string;
  fileUrl: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

const FORMATS = ['A1', 'A2', 'A3', 'A4', 'Story', 'Carré', 'Bannière', 'Autre'];

export function PostersManager({ initial }: { initial: Poster[] }) {
  const [posters, setPosters] = useState<Poster[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Poster | null>(null);

  async function del(id: string) {
    if (!confirm('Supprimer cette affiche ?')) return;
    const r = await fetch(`/api/admin/posters/${id}`, { method: 'DELETE' });
    if (r.ok) setPosters((p) => p.filter((x) => x.id !== id));
  }

  async function togglePublished(p: Poster) {
    const r = await fetch(`/api/admin/posters/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, published: !p.published })
    });
    if (r.ok) setPosters((arr) => arr.map((x) => x.id === p.id ? { ...x, published: !x.published } : x));
  }

  return (
    <>
      <button onClick={() => setAdding(true)} className="btn-primary mb-6">
        <Plus size={16} /> Téléverser une affiche
      </button>

      {posters.length === 0 ? (
        <div className="text-zinc-500 italic text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          Aucune affiche. Clique sur "Téléverser une affiche" pour ajouter ta première.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posters.map((p) => (
            <article key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="aspect-[3/4] bg-zinc-950 relative group">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                    <FileText size={42} />
                    <span className="text-xs mt-2">PDF</span>
                  </div>
                )}
                {!p.published && (
                  <div className="absolute top-2 left-2 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded">
                    Brouillon
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-brand-pink/10 text-brand-pink font-bold">{p.format}</span>
                  <span className="text-xs text-zinc-500">{p.downloads} dl</span>
                </div>
                <div className="font-semibold text-sm line-clamp-1">{p.title}</div>
                {p.size && <div className="text-xs text-zinc-500">{p.size}</div>}
                <div className="flex gap-1 mt-3">
                  <a href={p.fileUrl} target="_blank" className="flex-1 inline-flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 text-xs">
                    <Eye size={12} /> Voir
                  </a>
                  <button onClick={() => setEditing(p)} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-3 text-xs">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => togglePublished(p)} className="bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-3 text-xs">
                    {p.published ? <Eye size={12} className="text-emerald-400" /> : <EyeOff size={12} className="text-amber-400" />}
                  </button>
                  <button onClick={() => del(p.id)} className="bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded-lg py-1.5 px-3 text-xs">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {adding && <UploadDialog onClose={() => setAdding(false)} onAdded={(p) => { setPosters((arr) => [...arr, p]); setAdding(false); }} />}
      {editing && (
        <EditDialog
          poster={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => { setPosters((arr) => arr.map((x) => x.id === p.id ? p : x)); setEditing(null); }}
        />
      )}
    </>
  );
}

function UploadDialog({ onClose, onAdded }: { onClose: () => void; onAdded: (p: Poster) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('A3');
  const [size, setSize] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    if (thumb) fd.append('thumbnail', thumb);
    fd.append('title', title || file.name);
    fd.append('description', description);
    fd.append('format', format);
    fd.append('size', size);
    const r = await fetch('/api/admin/posters', { method: 'POST', body: fd });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onAdded({
      ...j.poster,
      fileUrl: `/api/storage/${j.poster.fileKey}`,
      thumbnailUrl: j.poster.thumbnailKey ? `/api/storage/${j.poster.thumbnailKey}` : null
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold flex items-center gap-2"><UploadCloud size={18} /> Nouvelle affiche</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <Field label="Fichier (PDF, JPG, PNG)">
            <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs file:bg-brand-pink file:text-white file:rounded-full file:px-4 file:py-2 file:border-0 file:mr-3" />
          </Field>
          <Field label="Image preview (optionnelle, JPG/PNG)">
            <input type="file" accept="image/*" onChange={(e) => setThumb(e.target.files?.[0] || null)}
              className="w-full text-xs file:bg-zinc-700 file:text-white file:rounded-full file:px-4 file:py-2 file:border-0 file:mr-3" />
          </Field>
          <Field label="Titre">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Affiche officielle 2026"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
          </Field>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Format">
              <select value={format} onChange={(e) => setFormat(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Dimensions">
              <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="297×420 mm"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={submit} disabled={busy || !file} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />} Téléverser
          </button>
        </div>
      </div>
    </div>
  );
}

function EditDialog({ poster, onClose, onSaved }: {
  poster: Poster; onClose: () => void; onSaved: (p: Poster) => void;
}) {
  const [v, setV] = useState(poster);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const r = await fetch(`/api/admin/posters/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved({ ...v, ...j.poster, fileUrl: poster.fileUrl, thumbnailUrl: poster.thumbnailUrl });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">Éditer l'affiche</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          <Field label="Titre">
            <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
          </Field>
          <Field label="Description">
            <textarea value={v.description || ''} onChange={(e) => setV({ ...v, description: e.target.value })} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Format">
              <select value={v.format} onChange={(e) => setV({ ...v, format: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                {FORMATS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Dimensions">
              <input value={v.size || ''} onChange={(e) => setV({ ...v, size: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
            </Field>
          </div>
          <Field label="Ordre d'affichage">
            <input type="number" value={v.order} onChange={(e) => setV({ ...v, order: Number(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2" />
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Enregistrer
          </button>
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
