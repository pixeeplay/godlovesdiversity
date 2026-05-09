'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, Eye, EyeOff, X, Loader2, Save, Image as ImageIcon, Video,
  Sparkles, UploadCloud, FileCode, Wand2, Film, Copy, Trash, Calendar
} from 'lucide-react';
import { SiriAIProgressBar } from './SiriAIProgressBar';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: any;
  bodyHtml?: string | null;
  coverImage: string | null;
  coverVideo: string | null;
  images?: string[];
  videoPrompt?: string | null;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
}

export function NewsManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/articles');
    const j = await r.json();
    setArticles(j.articles || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm('Supprimer cet article ? (irréversible)')) return;
    const r = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (r.ok) load();
  }

  async function togglePublish(a: Article) {
    const r = await fetch(`/api/admin/articles/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !a.published })
    });
    if (r.ok) load();
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400">{articles.length} actualité{articles.length > 1 ? 's' : ''} · {articles.filter((a) => a.published).length} publiée{articles.filter((a) => a.published).length > 1 ? 's' : ''}</p>
        <button onClick={() => setCreating(true)} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Plus size={14} /> Nouvelle actualité
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {articles.map((a) => (
            <article key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-zinc-950 relative">
                {a.coverVideo ? (
                  <video src={a.coverVideo} className="w-full h-full object-cover" muted />
                ) : a.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-700"><ImageIcon size={36} /></div>
                )}
                {a.images && a.images.length > 0 && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-[10px] text-white font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <ImageIcon size={10} /> +{a.images.length}
                  </span>
                )}
                <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.published ? 'bg-emerald-500/30 text-emerald-200' : 'bg-zinc-800 text-zinc-400'}`}>
                  {a.published ? 'Publié' : 'Brouillon'}
                </span>
              </div>
              <div className="p-3">
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{a.title}</h3>
                {a.excerpt && <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{a.excerpt}</p>}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <button onClick={() => setEditing(a)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded flex items-center gap-1">
                    <Pencil size={11} /> Éditer
                  </button>
                  <button onClick={() => togglePublish(a)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded flex items-center gap-1">
                    {a.published ? <><EyeOff size={11} /> Dépublier</> : <><Eye size={11} /> Publier</>}
                  </button>
                  <button onClick={() => remove(a.id)} className="text-xs text-rose-400 hover:text-rose-300 ml-auto"><Trash2 size={11} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ArticleEditor
          article={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}

/* ─── ÉDITEUR ──────────────────────────────────────────────── */

function ArticleEditor({ article, onClose, onSaved }: {
  article: Article | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(article?.title || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [bodyHtml, setBodyHtml] = useState(article?.bodyHtml || '');
  const [coverImage, setCoverImage] = useState(article?.coverImage || '');
  const [coverVideo, setCoverVideo] = useState(article?.coverVideo || '');
  const [images, setImages] = useState<string[]>(article?.images || []);
  const [videoPrompt, setVideoPrompt] = useState(article?.videoPrompt || '');
  const [tags, setTags] = useState((article?.tags || []).join(', '));
  const [published, setPublished] = useState(article?.published || false);

  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState<null | 'html' | 'image' | 'video'>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [imgCount, setImgCount] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function uploadCover(f: File) {
    setUploadBusy(true);
    const fd = new FormData();
    fd.append('files', f);
    const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const j = await r.json();
    if (j.ok && j.files?.[0]) {
      const file = j.files[0];
      if (file.mime?.startsWith('video/')) setCoverVideo(file.url);
      else setCoverImage(file.url);
    }
    setUploadBusy(false);
  }
  async function uploadGallery(files: FileList) {
    setUploadBusy(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const j = await r.json();
    if (j.ok && j.files) {
      setImages((prev) => [...prev, ...j.files.filter((f: any) => f.mime?.startsWith('image/')).map((f: any) => f.url)]);
    }
    setUploadBusy(false);
  }

  async function aiGenerate(mode: 'html' | 'image' | 'video-prompt') {
    if (!title.trim()) {
      setError('Définis au moins un titre avant de générer.');
      return;
    }
    setAiBusy(mode === 'video-prompt' ? 'video' : mode);
    setError(null);
    try {
      const r = await fetch('/api/admin/articles/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          title,
          excerpt,
          context: bodyHtml.slice(0, 500),
          count: mode === 'image' ? imgCount : 1
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || j.message || 'KO');

      if (mode === 'html') setBodyHtml(j.html || '');
      if (mode === 'image' && j.images) {
        // Si pas de cover encore, mets la 1ère en cover ; le reste va en gallery
        if (!coverImage && !coverVideo) setCoverImage(j.images[0]);
        const rest = !coverImage && !coverVideo ? j.images.slice(1) : j.images;
        if (rest.length > 0) setImages((prev) => [...prev, ...rest]);
      }
      if (mode === 'video-prompt') setVideoPrompt(j.videoPrompt || '');
    } catch (e: any) {
      setError(e?.message || 'erreur génération IA');
    }
    setAiBusy(null);
  }

  async function save() {
    if (!title.trim()) { setError('Titre requis'); return; }
    setSaving(true);
    setError(null);
    const url = article ? `/api/admin/articles/${article.id}` : '/api/admin/articles';
    const method = article ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        excerpt: excerpt || null,
        bodyHtml: bodyHtml || null,
        coverImage: coverImage || null,
        coverVideo: coverVideo || null,
        images,
        videoPrompt: videoPrompt || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        published,
        // Garde un content TipTap minimaliste pour compat
        content: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: (excerpt || title || ' ').slice(0, 500) }] }]
        }
      })
    });
    const j = await r.json();
    setSaving(false);
    if (j.ok) onSaved();
    else setError(j.error || j.message || 'erreur sauvegarde');
  }

  function copyVideoPrompt() {
    if (videoPrompt) navigator.clipboard.writeText(videoPrompt);
  }
  function removeImage(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }
  function promoteToCover(url: string) {
    setCoverImage(url);
    setCoverVideo('');
    setImages((prev) => prev.filter((u) => u !== url));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-5xl w-full my-4 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="border-b border-zinc-800 flex items-center justify-between p-4 sticky top-0 bg-zinc-900 z-10">
          <h2 className="font-bold flex items-center gap-2">
            <Sparkles size={16} className="text-fuchsia-400" />
            {article ? 'Éditer l\'actualité' : 'Nouvelle actualité'}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* APERÇU EN PREMIER (au-dessus) */}
        <div className="p-5 bg-gradient-to-br from-fuchsia-950/30 via-violet-950/20 to-cyan-950/20 border-b border-zinc-800">
          <p className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold mb-3 flex items-center gap-1.5">
            <Eye size={11} /> Aperçu en direct (tel qu'affiché sur la home)
          </p>
          <div className="bg-zinc-950 rounded-2xl overflow-hidden ring-1 ring-zinc-800">
            {/* Hero */}
            <div className="aspect-video bg-zinc-950 relative">
              {coverVideo ? (
                <video src={coverVideo} controls className="w-full h-full object-cover" />
              ) : coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-700 gap-2">
                  <ImageIcon size={36} />
                  <p className="text-xs">Aucune image — clique « Générer image » ou téléverse</p>
                </div>
              )}
              {published && (
                <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">PUBLIÉ</span>
              )}
              {tags.split(',').filter(Boolean).slice(0, 3).map((t, i) => (
                <span key={i} className="absolute top-3 right-3 bg-fuchsia-500/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded-full" style={{ marginRight: i * 60 }}>
                  #{t.trim()}
                </span>
              ))}
            </div>
            <div className="p-5">
              <h1 className="font-display text-2xl font-bold text-white mb-2">{title || <span className="text-zinc-600 italic">Titre de l'article…</span>}</h1>
              {excerpt && <p className="text-sm text-zinc-300 mb-3 italic">{excerpt}</p>}
              {bodyHtml ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-zinc-200"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p className="text-zinc-500 italic text-sm">Le contenu de l'article apparaîtra ici. Clique « Générer HTML » pour qu'une IA le rédige.</p>
              )}
              {/* Galerie */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.slice(0, 6).map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt="" className="aspect-video object-cover rounded-lg ring-1 ring-zinc-800" />
                  ))}
                </div>
              )}
              {videoPrompt && (
                <div className="mt-4 bg-violet-500/10 ring-1 ring-violet-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-violet-300 mb-1">
                    <Film size={10} /> Prompt vidéo prêt à coller dans Seedance/Veo/Runway
                  </div>
                  <pre className="text-[10px] text-violet-200/80 whitespace-pre-wrap">{videoPrompt.slice(0, 400)}{videoPrompt.length > 400 ? '…' : ''}</pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SIRI BUSY */}
        {aiBusy && (
          <div className="px-5 pt-4">
            <SiriAIProgressBar
              active={true}
              variant="banner"
              cycleMessages={
                aiBusy === 'html' ? ['🧠 Analyse du sujet…', '✍️ Rédaction du brouillon…', '🎨 Mise en forme HTML…', '✨ Touche finale…'] :
                aiBusy === 'image' ? ['🎨 Composition de la scène…', '🌅 Génération de la lumière…', `🖼 Rendu image ${imgCount > 1 ? '1' : ''}/${imgCount}…`, '✨ Optimisation…'] :
                ['🎬 Imagination de la séquence…', '📷 Définition du plan caméra…', '🎨 Choix de la palette…', '✨ Finalisation du prompt…']
              }
              subMessage={aiBusy === 'image' ? `Génération de ${imgCount} image${imgCount > 1 ? 's' : ''} via Gemini Imagen` : 'Gemini 2.5 Flash en action…'}
            />
          </div>
        )}

        {/* BOUTONS GÉNÉRER IA */}
        <div className="px-5 py-4 bg-zinc-950/50 border-b border-zinc-800 flex flex-wrap gap-2 items-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mr-2">Générer avec IA :</p>
          <button
            onClick={() => aiGenerate('html')}
            disabled={!!aiBusy || !title.trim()}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            {aiBusy === 'html' ? <Loader2 size={11} className="animate-spin" /> : <FileCode size={11} />}
            Générer HTML
          </button>
          <div className="flex items-center gap-1 bg-fuchsia-600 rounded-lg overflow-hidden">
            <button
              onClick={() => aiGenerate('image')}
              disabled={!!aiBusy || !title.trim()}
              className="hover:bg-fuchsia-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 flex items-center gap-1.5"
            >
              {aiBusy === 'image' ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
              Générer image
            </button>
            <select
              value={imgCount}
              onChange={(e) => setImgCount(Number(e.target.value))}
              className="bg-fuchsia-700 text-white text-xs px-2 py-2 border-l border-fuchsia-400/40 focus:outline-none"
              disabled={!!aiBusy}
            >
              <option value="1">×1</option>
              <option value="2">×2</option>
              <option value="3">×3</option>
              <option value="4">×4</option>
            </select>
          </div>
          <button
            onClick={() => aiGenerate('video-prompt')}
            disabled={!!aiBusy || !title.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"
          >
            {aiBusy === 'video' ? <Loader2 size={11} className="animate-spin" /> : <Film size={11} />}
            Vidéo (prompt only)
          </button>
        </div>

        {/* FORMULAIRE */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-xs text-rose-300">
              ⚠ {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Titre</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'article"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-semibold focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Chapeau (résumé court)</label>
            <textarea
              value={excerpt} onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Phrase d'accroche affichée dans le carrousel"
              rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          {/* Cover */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Image / vidéo de couverture</label>
              <button onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="text-xs text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-1">
                {uploadBusy ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />} Téléverser cover
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} />
            </div>
            {(coverImage || coverVideo) && (
              <div className="rounded-xl overflow-hidden bg-zinc-800 max-h-48 relative">
                {coverVideo ? (
                  <video src={coverVideo} controls className="w-full max-h-48 object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage} alt="" className="w-full max-h-48 object-cover" />
                )}
                <button
                  onClick={() => { setCoverImage(''); setCoverVideo(''); }}
                  className="absolute top-2 right-2 bg-black/70 hover:bg-rose-500 text-white p-1.5 rounded-full"
                  title="Retirer cover"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Galerie multi-images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Galerie ({images.length} image{images.length > 1 ? 's' : ''})</label>
              <button onClick={() => galleryRef.current?.click()} disabled={uploadBusy} className="text-xs text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-1">
                {uploadBusy ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />} Ajouter à la galerie
              </button>
              <input ref={galleryRef} type="file" accept="image/*" multiple hidden
                onChange={(e) => e.target.files && uploadGallery(e.target.files)} />
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((url, i) => (
                  <div key={i} className="relative group aspect-video bg-zinc-800 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => promoteToCover(url)}
                        className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-[10px] font-bold px-2 py-1 rounded"
                        title="En faire la cover"
                      >
                        ⭐ Cover
                      </button>
                      <button
                        onClick={() => removeImage(i)}
                        className="bg-rose-500 hover:bg-rose-400 text-white p-1 rounded"
                      >
                        <Trash size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body HTML */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Corps HTML</label>
            <textarea
              value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              placeholder="<h2>Sous-titre</h2><p>Contenu...</p>"
              spellCheck={false}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono focus:border-fuchsia-500 focus:outline-none"
            />
            <p className="text-[10px] text-zinc-500 mt-1">Tu peux écrire en HTML ou cliquer « Générer HTML » pour que Gemini te rédige un brouillon.</p>
          </div>

          {/* Video prompt */}
          {videoPrompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1.5"><Film size={10} /> Prompt vidéo</label>
                <button onClick={copyVideoPrompt} className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                  <Copy size={11} /> Copier
                </button>
              </div>
              <textarea
                value={videoPrompt} onChange={(e) => setVideoPrompt(e.target.value)}
                rows={6}
                className="w-full bg-cyan-950/30 border border-cyan-500/40 rounded-lg px-3 py-2 text-xs font-mono focus:border-cyan-400 focus:outline-none"
              />
            </div>
          )}

          {/* Tags + publish */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Tags (virgules)</label>
              <input
                value={tags} onChange={(e) => setTags(e.target.value)}
                placeholder="foi, témoignage, paris…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm self-end">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="accent-fuchsia-500 h-4 w-4" />
              Publier immédiatement
            </label>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2 sticky bottom-0 bg-zinc-900">
          <button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2 rounded-lg">Annuler</button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-sm px-5 py-2 rounded-lg flex items-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {article ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
