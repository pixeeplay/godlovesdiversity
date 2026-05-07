'use client';
import { useState, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Save, X, Loader2, ArrowUp, ArrowDown,
  UploadCloud, Image as ImageIcon, Video, Sparkles, Eye, EyeOff, Languages
} from 'lucide-react';

type Section = {
  id: string;
  pageSlug: string;
  locale: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  layout: string;
  accentColor: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

const LAYOUTS = [
  { v: 'banner', l: 'Bannière (centré)', icon: '🎯' },
  { v: 'text-image', l: 'Texte + image (à droite)', icon: '➡️' },
  { v: 'image-text', l: 'Image + texte (texte à droite)', icon: '⬅️' },
  { v: 'full-image', l: 'Image pleine largeur', icon: '🖼️' },
  { v: 'text-only', l: 'Texte seul', icon: '📝' },
  { v: 'quote', l: 'Citation', icon: '💬' }
];

const PAGE_LABELS: Record<string, string> = {
  'message': '✨ Le message',
  'argumentaire': '📚 L\'argumentaire',
  'a-propos': 'ℹ️ À propos'
};

export function PagesEditor({ pages, initialSections }: { pages: string[]; initialSections: Section[] }) {
  const [sections, setSections] = useState(initialSections);
  const [activePage, setActivePage] = useState(pages[0]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [creating, setCreating] = useState(false);

  const pageSections = sections.filter((s) => s.pageSlug === activePage && s.locale === 'fr');
  const [translating, setTranslating] = useState(false);

  async function translatePage() {
    if (!confirm(`Traduire toutes les sections de "${activePage}" en EN/ES/PT via IA ?`)) return;
    setTranslating(true);
    const r = await fetch('/api/admin/sections/translate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSlug: activePage })
    });
    const j = await r.json();
    setTranslating(false);
    alert(j.ok ? `${j.count} traductions générées ✅` : `Erreur : ${j.error || 'inconnue'}`);
  }

  async function move(s: Section, dir: 1 | -1) {
    const sorted = pageSections;
    const idx = sorted.findIndex((x) => x.id === s.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch(`/api/admin/sections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: target.order }) }),
      fetch(`/api/admin/sections/${target.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: s.order }) })
    ]);
    setSections((arr) => arr.map((x) => {
      if (x.id === s.id) return { ...x, order: target.order };
      if (x.id === target.id) return { ...x, order: s.order };
      return x;
    }));
  }

  async function togglePub(s: Section) {
    const r = await fetch(`/api/admin/sections/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !s.published })
    });
    if (r.ok) setSections((arr) => arr.map((x) => x.id === s.id ? { ...x, published: !s.published } : x));
  }

  async function del(s: Section) {
    if (!confirm('Supprimer cette section ?')) return;
    const r = await fetch(`/api/admin/sections/${s.id}`, { method: 'DELETE' });
    if (r.ok) setSections((arr) => arr.filter((x) => x.id !== s.id));
  }

  return (
    <>
      {/* Tabs pages */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {pages.map((p) => (
          <button key={p} onClick={() => setActivePage(p)}
            className={`px-4 py-2 rounded-full text-sm border transition flex items-center gap-2
              ${activePage === p ? 'border-brand-pink text-brand-pink bg-brand-pink/5' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
            {PAGE_LABELS[p] || `/${p}`}
            <span className="text-xs text-zinc-500">({sections.filter((s) => s.pageSlug === p).length})</span>
          </button>
        ))}
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <a href={`/${activePage}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
          <Eye size={12} /> Voir la page publique
        </a>
        <div className="flex gap-2">
          <button onClick={translatePage} disabled={translating} className="btn-ghost text-xs">
            {translating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Traduire EN/ES/PT (IA)
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            <Plus size={14} /> Nouvelle section
          </button>
        </div>
      </div>

      {/* Liste des sections de la page */}
      <div className="space-y-3">
        {pageSections.length === 0 && (
          <p className="text-zinc-500 italic text-center py-12 border border-dashed border-zinc-800 rounded-xl">
            Aucune section pour cette page. Crée la première.
          </p>
        )}
        {pageSections.sort((a, b) => a.order - b.order).map((s, i) => (
          <article key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
            {/* Aperçu média */}
            <div className="w-24 h-24 rounded-lg shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden">
              {s.mediaUrl ? (
                s.mediaType === 'video'
                  ? <video src={s.mediaUrl} muted className="w-full h-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={s.mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl opacity-50">{LAYOUTS.find((l) => l.v === s.layout)?.icon || '📝'}</span>
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 text-xs">
                <span className="text-zinc-500">#{i + 1}</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">{LAYOUTS.find((l) => l.v === s.layout)?.l || s.layout}</span>
                {s.accentColor && <span className="w-3 h-3 rounded-full" style={{ background: s.accentColor }} />}
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${s.published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {s.published ? 'En ligne' : 'Brouillon'}
                </span>
              </div>
              {s.subtitle && <div className="text-xs uppercase tracking-widest text-brand-pink">{s.subtitle}</div>}
              {s.title && <div className="font-bold text-base">{s.title}</div>}
              {s.body && <p className="text-sm text-zinc-400 line-clamp-2 mt-1">{s.body}</p>}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1">
              <button onClick={() => move(s, -1)} disabled={i === 0} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => move(s, 1)} disabled={i === pageSections.length - 1} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => setEditing(s)} className="text-zinc-400 hover:text-white p-1"><Pencil size={14} /></button>
              <button onClick={() => togglePub(s)} className="text-zinc-400 hover:text-white p-1">
                {s.published ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => del(s)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>

      {(editing || creating) && (
        <SectionEditor
          section={editing}
          defaultPageSlug={activePage}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(sec) => {
            setSections((arr) => {
              const idx = arr.findIndex((x) => x.id === sec.id);
              return idx === -1 ? [...arr, sec] : arr.map((x) => x.id === sec.id ? sec : x);
            });
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </>
  );
}

function SectionEditor({ section, defaultPageSlug, onClose, onSaved }: {
  section: Section | null;
  defaultPageSlug: string;
  onClose: () => void;
  onSaved: (s: Section) => void;
}) {
  const [title, setTitle] = useState(section?.title || '');
  const [subtitle, setSubtitle] = useState(section?.subtitle || '');
  const [body, setBody] = useState(section?.body || '');
  const [mediaUrl, setMediaUrl] = useState(section?.mediaUrl || '');
  const [mediaType, setMediaType] = useState(section?.mediaType || '');
  const [layout, setLayout] = useState(section?.layout || 'text-image');
  const [accentColor, setAccentColor] = useState(section?.accentColor || '#FF2BB1');
  const [ctaText, setCtaText] = useState(section?.ctaText || '');
  const [ctaUrl, setCtaUrl] = useState(section?.ctaUrl || '');
  const [pageSlug] = useState(section?.pageSlug || defaultPageSlug);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadMedia(f: File) {
    setUploadBusy(true);
    const fd = new FormData();
    fd.append('files', f);
    const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
    const j = await r.json();
    if (j.ok) {
      const file = j.files[0];
      setMediaUrl(file.url);
      setMediaType(file.mime.startsWith('video/') ? 'video' : 'image');
    }
    setUploadBusy(false);
  }

  async function aiText() {
    setAiBusy(true);
    const r = await fetch('/api/ai/text', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Rédige un paragraphe (80-120 mots) pour une section ${layout} de la page /${pageSlug} du mouvement parislgbt. ${title ? `Sujet : ${title}` : ''} Ton inclusif, lumineux, jamais polémique.`
      })
    });
    const j = await r.json();
    setBody(j.text || body);
    setAiBusy(false);
  }

  async function save() {
    setBusy(true);
    const url = section ? `/api/admin/sections/${section.id}` : '/api/admin/sections';
    const method = section ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageSlug, title, subtitle, body, mediaUrl, mediaType, layout, accentColor, ctaText, ctaUrl })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.section);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 flex items-center justify-between p-4">
          <h2 className="font-bold">{section ? 'Éditer la section' : `Nouvelle section · /${pageSlug}`}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Mise en page</label>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map((l) => (
                <button key={l.v} onClick={() => setLayout(l.v)}
                  className={`px-3 py-2 rounded-lg text-xs border text-left transition
                    ${layout === l.v ? 'border-brand-pink text-brand-pink bg-brand-pink/5' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  <div className="text-base">{l.icon}</div>
                  <div className="text-[10px] mt-1">{l.l}</div>
                </button>
              ))}
            </div>
          </div>

          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sur-titre (optionnel — ex: « Manifeste »)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm uppercase tracking-widest" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (gros)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-lg font-bold" />
          <div className="relative">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Texte de la section…"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <button onClick={aiText} disabled={aiBusy}
              className="absolute right-2 bottom-2 text-xs flex items-center gap-1 text-brand-pink hover:underline">
              {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Brouillon IA
            </button>
          </div>

          {/* Média */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Image ou vidéo</span>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*,video/*" hidden
                  onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="btn-ghost text-xs">
                  {uploadBusy ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Téléverser
                </button>
                {mediaUrl && (
                  <button onClick={() => { setMediaUrl(''); setMediaType(''); }} className="text-red-400 hover:text-red-300 text-xs">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            {mediaUrl && (
              <div className="rounded-lg overflow-hidden bg-zinc-800 max-h-72">
                {mediaType === 'video' ? (
                  <video src={mediaUrl} controls className="w-full max-h-64" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl} alt="" className="w-full max-h-64 object-cover" />
                )}
              </div>
            )}
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="ou colle une URL externe (https://…)"
              className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>

          {/* CTA optionnel */}
          <div className="grid grid-cols-2 gap-2">
            <input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Texte bouton (optionnel)"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="URL bouton (ex: /participer)"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Couleur d'accent */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Couleur d'accent</label>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer bg-transparent" />
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono w-32" />
              <div className="flex gap-1">
                {['#FF2BB1', '#FBBF24', '#34D399', '#22D3EE', '#8B5CF6', '#EF4444'].map((c) => (
                  <button key={c} onClick={() => setAccentColor(c)}
                    className="w-7 h-7 rounded-full border-2 border-white/10 hover:border-white"
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {section ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
