'use client';
import { useState, useRef } from 'react';
import { Plus, Calendar as Cal, Sparkles, Loader2, Image as ImageIcon, X, Pencil, Trash2, ChevronLeft, ChevronRight, Send, Library, Link2 } from 'lucide-react';
import { ConnectionsPanel } from './ConnectionsPanel';

const CHANNELS = [
  { v: 'INSTAGRAM', l: 'Instagram', ratio: 'aspect-square', max: '1080×1080', color: '#E1306C' },
  { v: 'FACEBOOK', l: 'Facebook', ratio: 'aspect-[1.91/1]', max: '1200×628', color: '#1877F2' },
  { v: 'X', l: 'X / Twitter', ratio: 'aspect-[16/9]', max: '1600×900', color: '#000' },
  { v: 'LINKEDIN', l: 'LinkedIn', ratio: 'aspect-[1.91/1]', max: '1200×628', color: '#0A66C2' },
  { v: 'TIKTOK', l: 'TikTok', ratio: 'aspect-[9/16]', max: '1080×1920', color: '#FF0050' }
];

type MediaFile = { key: string; url: string; mime: string; name: string };

type Post = {
  id: string;
  title: string | null;
  content: string;
  scheduledAt: string;
  channels: string[];
  mediaKeys: string[];
  status: string;
};

export function SocialCalendar({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [editing, setEditing] = useState<Post | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [view, setView] = useState<'cal' | 'list' | 'lib' | 'conn'>('cal');
  const [cursor, setCursor] = useState(new Date());

  function refresh(p: Post) {
    setPosts((arr) => {
      const idx = arr.findIndex((x) => x.id === p.id);
      const next = idx === -1 ? [...arr, p] : arr.map((x) => x.id === p.id ? p : x);
      return next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    });
  }

  async function delPost(id: string) {
    if (!confirm('Supprimer ce post ?')) return;
    const r = await fetch(`/api/admin/social/${id}`, { method: 'DELETE' });
    if (r.ok) setPosts((p) => p.filter((x) => x.id !== id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2">
          <Tab active={view === 'cal'} onClick={() => setView('cal')} icon={Cal} label="Calendrier" />
          <Tab active={view === 'list'} onClick={() => setView('list')} icon={Library} label="Liste" />
          <Tab active={view === 'lib'} onClick={() => setView('lib')} icon={ImageIcon} label="Bibliothèque" />
          <Tab active={view === 'conn'} onClick={() => setView('conn')} icon={Link2} label="Connexions" />
        </div>
        {view !== 'conn' && (
          <button onClick={() => setNewOpen(true)} className="btn-primary text-sm">
            <Plus size={16} /> Nouveau post
          </button>
        )}
      </div>

      {view === 'cal' && <CalendarGrid posts={posts} cursor={cursor} setCursor={setCursor} onClickPost={(p) => setEditing(p)} />}
      {view === 'list' && <PostList posts={posts} onEdit={setEditing} onDelete={delPost} />}
      {view === 'lib' && <MediaLibrary />}
      {view === 'conn' && <ConnectionsPanel />}

      {(editing || newOpen) && (
        <PostEditor
          post={editing || null}
          onClose={() => { setEditing(null); setNewOpen(false); }}
          onSaved={(p) => { refresh(p); setEditing(null); setNewOpen(false); }}
        />
      )}
    </>
  );
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border flex items-center gap-2 transition
        ${active ? 'border-brand-pink text-brand-pink bg-brand-pink/5' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function MediaLibrary() {
  const [files, setFiles] = useState<{ key: string; url: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  // Lit la médiathèque depuis MinIO via prochain endpoint dédié — pour l'instant placeholder
  // On affiche les médias des posts existants en attendant.
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500">
      <ImageIcon size={32} className="mx-auto mb-3 text-zinc-700" />
      <p className="text-sm">La bibliothèque média liste tous les fichiers uploadés via les posts et le bulk import.</p>
      <p className="text-xs mt-2">Module disponible dans la prochaine itération — pour l'instant, gère tes médias depuis l'éditeur de post.</p>
    </div>
  );
}

/** Construit l'URL du composer du réseau pour un post donné */
function getShareUrl(network: string, post: Post): string {
  const text = encodeURIComponent(post.content);
  const firstMedia = post.mediaKeys?.[0]
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/storage/${post.mediaKeys[0]}`
    : '';
  switch (network) {
    case 'X':
      return `https://twitter.com/intent/tweet?text=${text}`;
    case 'LINKEDIN':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(firstMedia)}&summary=${text}`;
    case 'FACEBOOK':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(firstMedia)}&quote=${text}`;
    case 'TELEGRAM':
      return `https://t.me/share/url?url=${encodeURIComponent(firstMedia)}&text=${text}`;
    case 'INSTAGRAM':
      return 'https://www.instagram.com';
    case 'TIKTOK':
      return 'https://www.tiktok.com/upload';
    default:
      return '#';
  }
}

function PostList({ posts, onEdit, onDelete }: {
  posts: Post[];
  onEdit: (p: Post) => void;
  onDelete: (id: string) => void;
}) {
  if (!posts.length)
    return <p className="text-zinc-500 italic">Aucun post programmé. Crée le premier.</p>;
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
          {p.mediaKeys?.[0] && (
            <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
              {/^.+\.(mp4|mov|webm)$/i.test(p.mediaKeys[0]) ? (
                <video src={`/api/storage/${p.mediaKeys[0]}`} muted className="w-full h-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/storage/${p.mediaKeys[0]}`} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">
                📅 {new Date(p.scheduledAt).toLocaleString('fr-FR')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                p.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-300'
                : p.status === 'FAILED' ? 'bg-red-500/10 text-red-300'
                : 'bg-zinc-800 text-zinc-300'
              }`}>{p.status}</span>
            </div>
            {p.title && <div className="font-semibold text-sm">{p.title}</div>}
            <p className="text-sm text-zinc-300 line-clamp-2">{p.content}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.channels.map((c) => {
                const meta = CHANNELS.find((x) => x.v === c);
                return (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                    {meta?.l || c}
                  </span>
                );
              })}
            </div>
            {/* Boutons "Partager" semi-auto */}
            <div className="mt-3 flex flex-wrap gap-1">
              {p.channels.map((c) => (
                <a
                  key={c}
                  href={getShareUrl(c, p)}
                  target="_blank" rel="noreferrer"
                  className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded-full bg-brand-pink/15 text-brand-pink hover:bg-brand-pink/25"
                  title={`Partager sur ${c}`}
                >
                  <Send size={10} /> {c}
                </a>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button onClick={() => onEdit(p)} className="text-zinc-400 hover:text-white p-2"><Pencil size={14} /></button>
            <button onClick={() => onDelete(p.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarGrid({ posts, cursor, setCursor, onClickPost }: {
  posts: Post[]; cursor: Date; setCursor: (d: Date) => void; onClickPost: (p: Post) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // lundi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const monthName = first.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  function postsOfDay(d: Date) {
    const ymd = d.toISOString().slice(0, 10);
    return posts.filter((p) => p.scheduledAt.slice(0, 10) === ymd);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="btn-ghost p-2">
          <ChevronLeft size={16} />
        </button>
        <h3 className="font-display text-lg capitalize">{monthName}</h3>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="btn-ghost p-2">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-zinc-500 mb-1">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d} className="text-center py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <div key={i} className={`min-h-20 rounded-lg p-1 text-xs ${d ? 'bg-zinc-950 border border-zinc-800' : ''}`}>
            {d && (
              <>
                <div className="text-zinc-500 mb-1">{d.getDate()}</div>
                <div className="space-y-1">
                  {postsOfDay(d).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onClickPost(p)}
                      className="w-full bg-brand-pink/15 hover:bg-brand-pink/25 text-brand-pink rounded px-1 py-0.5 truncate text-left"
                    >
                      {new Date(p.scheduledAt).getHours().toString().padStart(2, '0')}:
                      {new Date(p.scheduledAt).getMinutes().toString().padStart(2, '0')} {p.title || p.content.slice(0, 18)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PostEditor({ post, onClose, onSaved }: {
  post: Post | null;
  onClose: () => void;
  onSaved: (p: Post) => void;
}) {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [date, setDate] = useState(
    post?.scheduledAt ? post.scheduledAt.slice(0, 16) : new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  );
  const [channels, setChannels] = useState<string[]>(post?.channels || ['INSTAGRAM']);
  const [media, setMedia] = useState<MediaFile[]>(
    post?.mediaKeys?.map((k) => ({ key: k, url: `/api/storage/${k}`, mime: '', name: k.split('/').pop() || '' })) || []
  );
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadMedia(files: FileList) {
    setUploadBusy(true);
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('files', f);
    const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const j = await r.json();
    if (j.ok) setMedia((m) => [...m, ...j.files]);
    setUploadBusy(false);
  }

  async function aiSuggest() {
    setAiBusy(true);
    const r = await fetch('/api/ai/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Rédige un post court (≤280 caractères) pour ${channels.join(', ')} pour le mouvement parislgbt. Inclusif, lumineux, hashtag #parislgbt.`,
        system: 'Tu es community manager de parislgbt.'
      })
    });
    const j = await r.json();
    setContent(j.text || content);
    setAiBusy(false);
  }

  async function save() {
    setBusy(true);
    const url = post ? `/api/admin/social/${post.id}` : '/api/admin/social';
    const method = post ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content,
        channels,
        scheduledAt: date,
        mediaKeys: media.map((m) => m.key)
      })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.post);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 flex items-center justify-between p-4">
          <h2 className="font-bold flex items-center gap-2"><Cal size={16} /> {post ? 'Éditer le post' : 'Nouveau post'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 p-6 overflow-y-auto">
          {/* COL LEFT : forme */}
          <div className="space-y-4">
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre interne (optionnel)"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <div className="relative">
              <textarea
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Contenu du post — sera adapté à chaque réseau"
                rows={6}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
              />
              <button onClick={aiSuggest} disabled={aiBusy}
                className="absolute right-2 bottom-2 text-xs flex items-center gap-1 text-brand-pink hover:underline">
                {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} IA
              </button>
              <div className="text-xs text-zinc-500 mt-1">{content.length} caractères</div>
            </div>

            {/* Médias */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Médias (images / vidéos)</span>
                <button onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="btn-ghost text-xs">
                  {uploadBusy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} Ajouter
                </button>
                <input ref={fileRef} type="file" multiple accept="image/*,video/*" hidden
                  onChange={(e) => e.target.files && uploadMedia(e.target.files)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {media.map((m, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800 group">
                    {/^(.+)\.(mp4|mov|webm)$/i.test(m.key) ? (
                      <video src={m.url} muted className="w-full h-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <span className="text-sm text-zinc-400 block mb-2">Réseaux</span>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((c) => {
                  const on = channels.includes(c.v);
                  return (
                    <button
                      key={c.v}
                      onClick={() => setChannels((s) => on ? s.filter((x) => x !== c.v) : [...s, c.v])}
                      className={`px-3 py-1 rounded-full text-xs border transition
                        ${on ? 'border-brand-pink text-brand-pink bg-brand-pink/10' : 'border-zinc-700 text-zinc-400'}`}
                    >
                      {c.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date */}
            <input
              type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* COL RIGHT : preview par réseau */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <Sparkles size={14} /> Aperçus par réseau
            </h3>
            {channels.map((cv) => {
              const c = CHANNELS.find((x) => x.v === cv)!;
              const firstImage = media.find((m) => !/\.(mp4|mov|webm)$/i.test(m.key));
              const firstVideo = media.find((m) => /\.(mp4|mov|webm)$/i.test(m.key));
              return (
                <div key={cv} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="font-bold" style={{ color: c.color }}>{c.l}</span>
                    <span className="text-zinc-500">{c.max}</span>
                  </div>
                  <div className={`${c.ratio} bg-zinc-800 rounded-lg overflow-hidden mb-2 max-h-72 mx-auto`}
                       style={{ maxWidth: cv === 'TIKTOK' ? '180px' : '100%' }}>
                    {firstVideo ? (
                      <video src={firstVideo.url} muted controls className="w-full h-full object-cover" />
                    ) : firstImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={firstImage.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">Pas de média</div>
                    )}
                  </div>
                  <p className="text-sm text-white/90 whitespace-pre-wrap line-clamp-4">{content || '—'}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy || !content || channels.length === 0} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Cal size={14} />}
            {post ? 'Enregistrer' : 'Programmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
