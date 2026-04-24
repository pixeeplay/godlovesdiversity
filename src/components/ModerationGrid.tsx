'use client';
import { useState } from 'react';
import { Check, X, Trash2, MapPin, Pencil } from 'lucide-react';
import { PhotoEditor, EditablePhoto } from './admin/PhotoEditor';

type Item = EditablePhoto & { createdAt: string };

export function ModerationGrid({ photos }: { photos: Item[] }) {
  const [items, setItems] = useState(photos);
  const [editing, setEditing] = useState<EditablePhoto | null>(null);

  async function act(id: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    const r = await fetch(`/api/admin/photos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejectionReason: reason })
    });
    if (r.ok) setItems((x) => x.filter((p) => p.id !== id));
  }

  async function del(id: string) {
    if (!confirm('Supprimer définitivement ?')) return;
    const r = await fetch(`/api/admin/photos/${id}`, { method: 'DELETE' });
    if (r.ok) setItems((x) => x.filter((p) => p.id !== id));
  }

  if (items.length === 0)
    return <div className="text-zinc-500 italic">Aucune photo dans cet état.</div>;

  return (
    <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((p) => (
          <article key={p.id} className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden group">
            <button
              onClick={() => setEditing(p)}
              className="aspect-square bg-zinc-950 relative w-full block"
            >
              {p.storageKey?.startsWith('demo/') ? (
                <div className="w-full h-full bg-gradient-to-br from-brand-pink/30 to-purple-600/30 flex items-center justify-center text-3xl">❤️</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur rounded-full p-2 opacity-0 group-hover:opacity-100 transition">
                <Pencil size={14} />
              </div>
            </button>
            <div className="p-4 text-sm">
              <div className="font-semibold">{p.authorName || 'Anonyme'}</div>
              <div className="text-zinc-400 flex items-center gap-1 text-xs">
                <MapPin size={12} /> {p.placeName || '—'} · {p.city || ''} {p.country || ''}
              </div>
              {p.caption && <p className="mt-2 text-zinc-300 italic line-clamp-2">"{p.caption}"</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => act(p.id, 'APPROVED')}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 rounded-lg py-2 text-xs"
                >
                  <Check size={14} /> Approuver
                </button>
                <button
                  onClick={() => {
                    const r = prompt('Raison du rejet ?') || 'Non conforme';
                    act(p.id, 'REJECTED', r);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 rounded-lg py-2 text-xs"
                >
                  <X size={14} /> Rejeter
                </button>
                <button
                  onClick={() => del(p.id)}
                  className="inline-flex items-center justify-center bg-red-600/20 text-red-300 hover:bg-red-600/30 rounded-lg py-2 px-3 text-xs"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <PhotoEditor
          photo={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => setItems((arr) => arr.map((x) => x.id === p.id ? { ...x, ...p } : x))}
          onDeleted={() => setItems((arr) => arr.filter((x) => x.id !== editing.id))}
        />
      )}
    </>
  );
}
