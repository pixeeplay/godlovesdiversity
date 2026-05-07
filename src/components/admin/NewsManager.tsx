'use client';
import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, Save, Image as ImageIcon, Video, Sparkles, UploadCloud } from 'lucide-react';

type Article = {
  id: string;
  title: string;
  slug: string;
  locale: string;
  excerpt: string | null;
  content: any;
  coverImage: string | null;
  coverVideo: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

export function NewsManager({ initial }: { initial: Article[] }) {
  const [articles, setArticles] = useState<Article[]>(initial);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  async function del(id: string) {
    if (!confirm('Supprimer cette actualité ?')) return;
    const r = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (r.ok) setArticles((a) => a.filter((x) => x.id !== id));
  }

  async function togglePub(a: Article) {
    const r = await fetch(`/api/admin/articles/${a.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !a.published })
    });
    const j = await r.json();
    if (j.ok) setArticles((arr) => arr.map((x) => x.id === a.id ? { ...x, ...j.article } : x));
  }

  return (
    <>
      <button onClick={() => setCreating(true)} className="btn-primary mb-6">
        <Plus size={16} /> Nouvelle actualité
      </button>

      {articles.length === 0 ? (
        <p className="text-zinc-500 italic text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
          Aucune actualité.
        </p>
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <article key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4 items-center">
              {a.coverImage ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              ) : a.coverVideo ? (
                <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-800 flex items-center justify-center">
                  <Video className="text-zinc-500" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-lg shrink-0 bg-zinc-800 flex items-center justify-center text-zinc-600">
                  <ImageIcon size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs text-zinc-500">
                    {a.publishedAt ? `Publié le ${new Date(a.publishedAt).toLocaleDateString('fr-FR')}` : `Brouillon · créé ${new Date(a.createdAt).toLocaleDateString('fr-FR')}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${a.published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                    {a.published ? 'En ligne' : 'Brouillon'}
                  </span>
                </div>
                <div className="font-semibold">{a.title}</div>
                {a.excerpt && <p className="text-sm text-zinc-400 line-clamp-1">{a.excerpt}</p>}
                <div className="flex gap-1 mt-2">
                  {a.tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">#{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(a)} className="text-zinc-400 hover:text-white p-2"><Pencil size={14} /></button>
                <button onClick={() => togglePub(a)} className="text-zinc-400 hover:text-white p-2">
                  {a.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => del(a.id)} className="text-red-400 hover:text-red-300 p-2"><Trash2 size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ArticleEditor
          article={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(a) => {
            setArticles((arr) => {
              const idx = arr.findIndex((x) => x.id === a.id);
              return idx === -1 ? [a, ...arr] : arr.map((x) => x.id === a.id ? a : x);
            });
            setEditing(null);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function ArticleEditor({ article, onClose, onSaved }: {
  article: Article | null;
  onClose: () => void;
  onSaved: (a: Article) => void;
}) {
  const [title, setTitle] = useState(article?.title || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [bodyText, setBodyText] = useState(
    article?.content?.content?.[0]?.content?.[0]?.text || ''
  );
  const [coverImage, setCoverImage] = useState(article?.coverImage || '');
  const [coverVideo, setCoverVideo] = useState(article?.coverVideo || '');
  const [tags, setTags] = useState((article?.tags || []).join(', '));
  const [published, setPublished] = useState(article?.published || false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadCover(f: File) {
    setUploadBusy(true);
    const fd = new FormData();
    fd.append('files', f);
    const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const j = await r.json();
    if (j.ok) {
      const file = j.files[0];
      if (file.mime.startsWith('video/')) setCoverVideo(file.url);
      else setCoverImage(file.url);
    }
    setUploadBusy(false);
  }

  async function aiBody() {
    setAiBusy(true);
    const r = await fetch('/api/ai/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Rédige un article court (200 mots) pour le mouvement parislgbt. Sujet : ${title || 'inclusion religieuse'}. Ton chaleureux et apaisé, format markdown.`,
        system: 'Tu es éditorialiste pour le mouvement.'
      })
    });
    const j = await r.json();
    setBodyText(j.text || bodyText);
    setAiBusy(false);
  }

  async function save() {
    setBusy(true);
    const url = article ? `/api/admin/articles/${article.id}` : '/api/admin/articles';
    const method = article ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        excerpt,
        coverImage: coverImage || null,
        coverVideo: coverVideo || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        published,
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: bodyText || ' ' }] }]
        }
      })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.article);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 flex items-center justify-between p-4">
          <h2 className="font-bold">{article ? 'Éditer l\'actualité' : 'Nouvelle actualité'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'article"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-semibold"
          />
          <textarea
            value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Chapeau / résumé court"
            rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />

          {/* Couverture */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Image ou vidéo de couverture</span>
              <button onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="btn-ghost text-xs">
                {uploadBusy ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Téléverser
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </div>
            {(coverImage || coverVideo) && (
              <div className="rounded-xl overflow-hidden bg-zinc-800 max-h-64">
                {coverVideo ? (
                  <video src={coverVideo} controls className="w-full max-h-64 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage} alt="" className="w-full max-h-64 object-cover" />
                )}
              </div>
            )}
          </div>

          {/* Corps */}
          <div className="relative">
            <textarea
              value={bodyText} onChange={(e) => setBodyText(e.target.value)} rows={10}
              placeholder="Contenu de l'article…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            />
            <button onClick={aiBody} disabled={aiBusy}
              className="absolute right-2 bottom-2 text-xs flex items-center gap-1 text-brand-pink hover:underline">
              {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Brouillon IA
            </button>
          </div>

          <input
            value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="Tags séparés par des virgules : foi, témoignage, paris…"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publier immédiatement
          </label>
        </div>
        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy || !title} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {article ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
