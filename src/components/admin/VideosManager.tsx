'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, ArrowUp, ArrowDown, Eye, EyeOff, Youtube, ExternalLink } from 'lucide-react';

type Video = {
  id: string; videoId: string; title: string; description: string | null;
  order: number; published: boolean; createdAt: string; updatedAt: string;
};

export function VideosManager({ initial }: { initial: Video[] }) {
  const [videos, setVideos] = useState(initial);
  const [editing, setEditing] = useState<Video | null>(null);
  const [creating, setCreating] = useState(false);

  async function move(v: Video, dir: 1 | -1) {
    const sorted = [...videos].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === v.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch(`/api/admin/videos/${v.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: target.order }) }),
      fetch(`/api/admin/videos/${target.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: v.order }) })
    ]);
    setVideos((arr) => arr.map((x) => {
      if (x.id === v.id) return { ...x, order: target.order };
      if (x.id === target.id) return { ...x, order: v.order };
      return x;
    }));
  }

  async function togglePub(v: Video) {
    const r = await fetch(`/api/admin/videos/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !v.published })
    });
    if (r.ok) setVideos((arr) => arr.map((x) => x.id === v.id ? { ...x, published: !v.published } : x));
  }

  async function del(v: Video) {
    if (!confirm('Supprimer cette vidéo ?')) return;
    const r = await fetch(`/api/admin/videos/${v.id}`, { method: 'DELETE' });
    if (r.ok) setVideos((arr) => arr.filter((x) => x.id !== v.id));
  }

  return (
    <>
      <button onClick={() => setCreating(true)} className="btn-primary mb-6">
        <Plus size={16} /> Ajouter une vidéo
      </button>

      {videos.length === 0 ? (
        <p className="text-zinc-500 italic text-center py-12 border border-dashed border-zinc-800 rounded-xl">
          Aucune vidéo. Ajoute-en une via le bouton ci-dessus.
        </p>
      ) : (
        <div className="space-y-3">
          {videos.sort((a, b) => a.order - b.order).map((v, i) => (
            <article key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 items-center">
              <div className="w-32 aspect-video rounded shrink-0 overflow-hidden bg-black relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Youtube size={10} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 text-xs">
                  <span className="text-zinc-500">#{i + 1}</span>
                  <code className="text-zinc-500">{v.videoId}</code>
                  <a href={`https://youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer"
                     className="text-zinc-400 hover:text-brand-pink"><ExternalLink size={11} /></a>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${v.published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    {v.published ? 'En ligne' : 'Brouillon'}
                  </span>
                </div>
                <div className="font-bold">{v.title}</div>
                {v.description && <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{v.description}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => move(v, -1)} disabled={i === 0} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => move(v, 1)} disabled={i === videos.length - 1} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => setEditing(v)} className="text-zinc-400 hover:text-white p-1"><Pencil size={14} /></button>
                <button onClick={() => togglePub(v)} className="text-zinc-400 hover:text-white p-1">
                  {v.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => del(v)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <Editor
          video={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(v) => {
            setVideos((arr) => {
              const idx = arr.findIndex((x) => x.id === v.id);
              return idx === -1 ? [...arr, v] : arr.map((x) => x.id === v.id ? v : x);
            });
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </>
  );
}

function Editor({ video, onClose, onSaved }: { video: Video | null; onClose: () => void; onSaved: (v: Video) => void }) {
  const [url, setUrl] = useState(video ? `https://youtube.com/watch?v=${video.videoId}` : '');
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const u = video ? `/api/admin/videos/${video.id}` : '/api/admin/videos';
    const method = video ? 'PATCH' : 'POST';
    const body = video ? { title, description } : { url, title, description };
    const r = await fetch(u, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.video);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold flex items-center gap-2"><Youtube className="text-red-500" size={18} /> {video ? 'Éditer la vidéo' : 'Nouvelle vidéo'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {!video && (
            <label className="block text-xs text-zinc-400">URL ou ID YouTube
              <input value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=… ou simplement l'ID 11 caractères"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
            </label>
          )}
          <label className="block text-xs text-zinc-400">Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Témoignage de Marie"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs text-zinc-400">Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy || !title || (!video && !url)} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
