'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, ArrowUp, ArrowDown, Eye, EyeOff, Youtube, ExternalLink } from 'lucide-react';

type Video = {
  id: string; videoId: string; title: string; description: string | null;
  thumbnailUrl?: string | null;
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
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnailUrl || '');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ID YouTube extrait pour le preview live
  const videoId = video?.videoId || extractYoutubeId(url);

  async function save() {
    setBusy(true);
    const u = video ? `/api/admin/videos/${video.id}` : '/api/admin/videos';
    const method = video ? 'PATCH' : 'POST';
    const body: any = video ? { title, description, thumbnailUrl } : { url, title, description, thumbnailUrl };
    const r = await fetch(u, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.video);
  }

  async function uploadThumb(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.url) setThumbnailUrl(j.url);
      else alert(j.error || 'Upload échoué');
    } catch (e: any) { alert(e.message); }
    setUploading(false);
  }

  // URL preview vignette
  const previewSrc = thumbnailUrl || (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : '');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold flex items-center gap-2"><Youtube className="text-red-500" size={18} /> {video ? 'Éditer la vidéo' : 'Nouvelle vidéo'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Colonne gauche : preview + lecteur */}
          <div className="space-y-3">
            <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider">Aperçu vignette</label>
            <div className="aspect-video rounded-lg overflow-hidden bg-black border border-zinc-700 relative">
              {previewSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt="" className="w-full h-full object-cover"
                     onError={(e) => { if (videoId) e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm">Saisis l'URL pour voir la vignette</div>
              )}
            </div>

            {videoId && (
              <>
                <label className="block text-xs text-zinc-400 font-bold uppercase tracking-wider mt-3">Lecteur YouTube</label>
                <div className="aspect-video rounded-lg overflow-hidden bg-black border border-zinc-700">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              </>
            )}
          </div>

          {/* Colonne droite : champs */}
          <div className="space-y-3">
            {!video && (
              <label className="block text-xs text-zinc-400">URL ou ID YouTube *
                <input value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=… ou ID 11 chars"
                  className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
              </label>
            )}
            <label className="block text-xs text-zinc-400">Titre *
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Témoignage de Marie"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs text-zinc-400">Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs text-zinc-400">Vignette personnalisée (URL)
              <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://… (laisse vide pour utiliser celle de YouTube)"
                className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-[11px]" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400">…ou uploader une image</span>
              <div className="mt-1 flex items-center gap-2">
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadThumb(f); }}
                       className="block w-full text-xs text-zinc-300 file:bg-brand-pink file:text-white file:border-0 file:rounded file:px-3 file:py-1.5 file:font-bold file:cursor-pointer file:mr-2" />
                {uploading && <Loader2 size={14} className="animate-spin text-brand-pink" />}
              </div>
              {thumbnailUrl && (
                <button type="button" onClick={() => setThumbnailUrl('')}
                        className="mt-2 text-[11px] text-red-400 hover:text-red-300">× Réinitialiser la vignette</button>
              )}
            </label>
          </div>
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

function extractYoutubeId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Si c'est déjà un ID (11 caractères)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Sinon parser l'URL
  const m = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
