'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Type, Image as ImageIcon, Video as VideoIcon, Layout, Square, Columns, Code as CodeIcon,
  Loader2, Save, Trash2, GripVertical, Plus, ArrowUp, ArrowDown, X, Eye, MousePointer,
  Mountain, Layers, Sparkles, Search, Globe, Download, RefreshCw
} from 'lucide-react';
import { EFFECTS, EFFECT_CATEGORIES, type Effect, type EffectCategory } from '@/lib/effects-library';

/**
 * Page Builder visuel avec drag&drop minimaliste.
 *
 * Features V1 :
 *   - 8 types de blocs (text/image/video/cta/hero/columns/embed/spacer)
 *   - 6 widths (1/4, 1/3, 1/2, 2/3, 3/4, full)
 *   - 5 effets (none, fade, slide-up, slide-left, scale)
 *   - Drag & drop pour réordonner
 *   - Toggle visible
 *   - Preview live à côté
 *   - Save tout-en-un
 */

interface Block {
  id?: string;
  position: number;
  width: string;
  height: string;
  type: string;
  data: any;
  effect: string | null;
  effectDelay: number | null;
  visible: boolean;
}

const BLOCK_TYPES = [
  { type: 'text',           icon: Type,         label: 'Texte',           color: 'sky' },
  { type: 'image',          icon: ImageIcon,    label: 'Image',           color: 'fuchsia' },
  { type: 'video',          icon: VideoIcon,    label: 'Vidéo',           color: 'rose' },
  { type: 'cta',            icon: MousePointer, label: 'CTA',             color: 'amber' },
  { type: 'hero',           icon: Layout,       label: 'Hero',            color: 'violet' },
  { type: 'parallax-hero',  icon: Mountain,     label: 'Parallax Hero',   color: 'fuchsia' },
  { type: 'parallax-slider',icon: Layers,       label: 'Parallax Slider', color: 'cyan' },
  { type: 'columns',        icon: Columns,      label: 'Colonnes',        color: 'emerald' },
  { type: 'embed',          icon: CodeIcon,     label: 'Embed',           color: 'cyan' },
  { type: 'spacer',         icon: Square,       label: 'Espace',          color: 'zinc' }
];

const WIDTH_OPTIONS = [
  { v: '1/4',  label: '¼' },
  { v: '1/3',  label: '⅓' },
  { v: '1/2',  label: '½' },
  { v: '2/3',  label: '⅔' },
  { v: '3/4',  label: '¾' },
  { v: 'full', label: '100%' }
];

export function PageBuilderEditor({ slug }: { slug: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [previewMode, setPreviewMode] = useState<'live' | 'blocks'>('live');
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiImages, setAiImages] = useState('');
  const [aiVideo, setAiVideo] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiMode, setAiMode] = useState<'replace' | 'append'>('append');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  async function generateAi() {
    if (!aiPrompt.trim()) { alert('Décris ce que tu veux générer'); return; }
    setAiGenerating(true);
    try {
      const r = await fetch('/api/admin/page-builder/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          prompt: aiPrompt.trim(),
          theme: 'custom',
          wantParallaxHero: true,
          wantSlider: aiImages.split(/[,\n]/).filter(Boolean).length >= 3,
          wantVideo: !!aiVideo,
          imageUrls: aiImages.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
          videoUrl: aiVideo,
          mode: aiMode
        })
      });
      const j = await r.json();
      if (j.ok) {
        alert(`✓ ${j.blocksCount} blocs générés et ${aiMode === 'replace' ? 'remplacés' : 'ajoutés'} !`);
        setShowAi(false);
        setAiPrompt('');
        load();
      } else {
        alert('Erreur Gemini : ' + (j.error || 'unknown'));
      }
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
    setAiGenerating(false);
  }

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/page-builder/${slug}`, { cache: 'no-store' });
    const j = await r.json();
    setBlocks(j.blocks || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  async function importLivePage(mode: 'replace' | 'append', intensity: 'none' | 'subtle' | 'medium' | 'wow' = 'subtle') {
    setImporting(true);
    try {
      const r = await fetch(`/api/admin/page-builder/${slug}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: 'fr', mode, effectIntensity: intensity })
      });
      const j = await r.json();
      if (j.ok) {
        alert(`✓ ${j.blocksCount} bloc(s) ${mode === 'replace' ? 'remplacés' : 'ajoutés'} depuis ${j.sourceUrl}`);
        setShowImportModal(false);
        load();
      } else {
        alert('Erreur import : ' + (j.error || 'unknown'));
      }
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
    setImporting(false);
  }

  async function verifyImport() {
    setVerifying(true);
    try {
      const r = await fetch(`/api/admin/page-builder/verify?slug=${slug}`);
      const j = await r.json();
      setVerifyResult(j);
    } catch (e: any) {
      alert('Erreur verify : ' + e.message);
    }
    setVerifying(false);
  }

  function reloadIframe() {
    setIframeKey((k) => k + 1);
  }

  function addBlock(type: string) {
    const defaultData: any = {
      text:    { html: '<h2>Titre</h2><p>Ton paragraphe ici…</p>' },
      image:   { src: '', alt: '' },
      video:   { src: '' },
      cta:     { label: 'Cliquer ici', href: '/' },
      hero:    { title: 'Titre Hero', subtitle: 'Sous-titre', cta: { label: 'CTA', href: '/' }, bgImage: '' },
      'parallax-hero': {
        title: 'God Loves Diversity',
        subtitle: 'Une communauté inclusive où chacun trouve sa place',
        ctaLabel: 'Découvrir',
        ctaHref: '/about',
        bgImage: '',
        midImage: '',
        fgImage: '',
        floatingText: 'EXPLORE',
        height: '90vh',
        bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
        overlayColor: 'rgba(0,0,0,0.25)'
      },
      'parallax-slider': {
        slides: [
          { title: 'Foi', subtitle: 'Communauté inclusive', tagline: '01 / 03', image: '', accentColor: '#d946ef', ctaLabel: 'En savoir plus', ctaHref: '/foi' },
          { title: 'Liberté', subtitle: 'Sans jugement', tagline: '02 / 03', image: '', accentColor: '#06b6d4', ctaLabel: 'Découvrir', ctaHref: '/liberte' },
          { title: 'Amour', subtitle: 'Sans frontières', tagline: '03 / 03', image: '', accentColor: '#f59e0b', ctaLabel: 'Rejoindre', ctaHref: '/amour' }
        ],
        height: '85vh',
        autoplay: true,
        autoplayDelay: 6500
      },
      columns: { columns: [{ html: '<p>Col 1</p>' }, { html: '<p>Col 2</p>' }] },
      embed:   { html: '<!-- iframe ou code custom -->' },
      spacer:  { height: 60 }
    };
    setBlocks((prev) => [...prev, {
      position: prev.length,
      width: 'full',
      height: 'auto',
      type,
      data: defaultData[type] || {},
      effect: 'fade',
      effectDelay: prev.length * 100,
      visible: true
    }]);
    setEditingIdx(blocks.length);
  }

  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }
  function updateBlockData(idx: number, dataPatch: any) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, data: { ...b.data, ...dataPatch } } : b)));
  }
  function moveBlock(from: number, to: number) {
    setBlocks((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((b, i) => ({ ...b, position: i }));
    });
  }
  function removeBlock(idx: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, position: i })));
    setEditingIdx(null);
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/page-builder/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });
    setSaving(false);
    setSavedAt(new Date());
    load();
  }

  const editingBlock = editingIdx != null ? blocks[editingIdx] : null;

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-[1800px] mx-auto">
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3 flex items-center gap-3 sticky top-3 z-30 backdrop-blur flex-wrap">
        <a href="/admin/page-builder" className="text-xs text-zinc-400 hover:text-white">← Pages</a>
        <code className="text-xs text-zinc-300 bg-zinc-950 px-2 py-1 rounded">/{slug}</code>
        <span className="text-xs text-zinc-500">{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowImportModal(true)}
          disabled={importing}
          className="bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-50 text-cyan-300 hover:text-cyan-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ring-1 ring-cyan-500/30"
          title="Convertit le contenu actuel de la page Next.js en blocs éditables"
        >
          {importing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          {importing ? 'Import…' : 'Importer la page actuelle'}
        </button>
        <button
          onClick={() => setShowAi(true)}
          className="bg-gradient-to-r from-amber-400/20 to-fuchsia-500/20 hover:from-amber-400/30 hover:to-fuchsia-500/30 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ring-1 ring-amber-500/30"
          title="Génère ou complète la page avec Gemini IA"
        >
          <Sparkles size={12} /> IA
        </button>
        <div className="ml-auto flex items-center gap-2">
          <a href={`/fr/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">↗ Voir page</a>
          <label className="flex items-center gap-1 text-xs text-zinc-300 cursor-pointer"><input type="checkbox" checked={showPreview} onChange={(e) => setShowPreview(e.target.checked)} /> Preview</label>
          {savedAt && <span className="text-[10px] text-emerald-400">✓ {savedAt.toLocaleTimeString()}</span>}
          <button onClick={save} disabled={saving} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Enregistrer
          </button>
        </div>
      </div>

      {/* Palette de blocs */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Ajouter un bloc</p>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map((bt) => {
            const Icon = bt.icon;
            return (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-fuchsia-500 text-xs text-zinc-300 hover:text-white px-3 py-2 rounded-lg transition"
              >
                <Icon size={12} /> {bt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`grid gap-3 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Liste de blocs (édition) */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
          ) : blocks.length === 0 ? (
            <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-8 text-center">
              <Layout size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-300 font-bold mb-1">Aucun bloc enregistré</p>
              <p className="text-xs text-zinc-500 mb-4">
                Cette page a probablement déjà du contenu Next.js (visible dans <strong>Preview Live</strong> →).<br />
                Importe-le pour pouvoir l'éditer, ou ajoute des blocs manuellement.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setShowImportModal(true)} disabled={importing} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
                  {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                  Importer la page actuelle
                </button>
                <button onClick={() => addBlock('hero')} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
                  <Plus size={11} /> Bloc Hero
                </button>
              </div>
            </div>
          ) : (
            blocks.map((b, i) => (
              <article
                key={b.id || `new-${i}`}
                draggable
                onDragStart={() => setDraggedIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (draggedIdx != null && draggedIdx !== i) moveBlock(draggedIdx, i); setDraggedIdx(null); }}
                onClick={() => setEditingIdx(i)}
                className={`bg-zinc-900 ring-1 ${editingIdx === i ? 'ring-fuchsia-500' : 'ring-zinc-800'} rounded-2xl p-3 cursor-pointer transition ${draggedIdx === i ? 'opacity-30' : ''} ${!b.visible ? 'opacity-50' : ''}`}
              >
                <header className="flex items-center gap-2 mb-2">
                  <GripVertical size={12} className="text-zinc-600 cursor-grab" />
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">{b.type}</span>
                  <span className="text-[10px] text-zinc-500">{b.width} · {b.effect || 'aucun effet'}</span>
                  <div className="ml-auto flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); updateBlock(i, { visible: !b.visible }); }} className="p-1 text-zinc-500 hover:text-zinc-200" title="Toggle visible"><Eye size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); if (i > 0) moveBlock(i, i - 1); }} disabled={i === 0} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowUp size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); if (i < blocks.length - 1) moveBlock(i, i + 1); }} disabled={i === blocks.length - 1} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowDown size={10} /></button>
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Supprimer ce bloc ?')) removeBlock(i); }} className="p-1 text-rose-400 hover:text-rose-300"><Trash2 size={10} /></button>
                  </div>
                </header>
                <BlockSummary block={b} />
              </article>
            ))
          )}
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="bg-zinc-950 ring-1 ring-zinc-800 rounded-2xl overflow-hidden sticky top-20 self-start" style={{ maxHeight: '80vh' }}>
            <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1"><Eye size={11} /> Preview</span>
              <div className="flex items-center gap-0.5 bg-zinc-950 rounded p-0.5">
                <button
                  onClick={() => setPreviewMode('live')}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition ${previewMode === 'live' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Globe size={9} /> Live
                </button>
                <button
                  onClick={() => setPreviewMode('blocks')}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition ${previewMode === 'blocks' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                >
                  <Layout size={9} /> Blocs ({blocks.length})
                </button>
              </div>
              {previewMode === 'live' && (
                <button onClick={reloadIframe} className="ml-auto text-[10px] text-zinc-400 hover:text-white flex items-center gap-1">
                  <RefreshCw size={9} /> Recharger
                </button>
              )}
            </header>
            {previewMode === 'live' ? (
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={`/fr/${slug}`}
                className="w-full block bg-white"
                style={{ height: '74vh', border: 0 }}
                title={`Preview /${slug}`}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            ) : (
              <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '74vh' }}>
                {blocks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-500 mb-3">Aucun bloc dans le builder pour cette page.</p>
                    <button onClick={() => setShowImportModal(true)} disabled={importing} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
                      {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                      Importer la page actuelle
                    </button>
                  </div>
                ) : (
                  blocks.filter((b) => b.visible).map((b, i) => <PreviewBlock key={i} block={b} />)
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawer édition */}
      {editingBlock && editingIdx != null && (
        <BlockEditDrawer
          block={editingBlock}
          onChange={(patch) => updateBlock(editingIdx, patch)}
          onChangeData={(patch) => updateBlockData(editingIdx, patch)}
          onClose={() => setEditingIdx(null)}
        />
      )}

      {/* Modal Import live page */}
      {showImportModal && (
        <ImportPageModal
          slug={slug}
          existingBlocks={blocks.length}
          importing={importing}
          verifying={verifying}
          verifyResult={verifyResult}
          onVerify={verifyImport}
          onImport={importLivePage}
          onClose={() => { setShowImportModal(false); setVerifyResult(null); }}
        />
      )}

      {/* Modal AI generator */}
      {showAi && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setShowAi(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">
            <header className="bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border-b border-amber-500/30 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center text-xl">✨</div>
              <div>
                <h3 className="text-base font-bold text-white">IA pour /{slug}</h3>
                <p className="text-[11px] text-zinc-300">Gemini génère / complète tes blocs</p>
              </div>
              <button onClick={() => setShowAi(false)} className="ml-auto text-zinc-400 hover:text-white"><X size={16} /></button>
            </header>
            <div className="p-4 space-y-3">
              <label className="block text-xs">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Demande</span>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={5}
                  placeholder='Ex: "Ajoute un bloc parallax-hero spectaculaire + 3 sections texte sur ma vision + un slider de 4 photos + un CTA"'
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
                />
              </label>
              <label className="block text-xs">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">URLs images (séparées par virgule ou retour ligne)</span>
                <textarea
                  value={aiImages}
                  onChange={(e) => setAiImages(e.target.value)}
                  rows={2}
                  placeholder="https://... , https://... , https://..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </label>
              <label className="block text-xs">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">URL vidéo (YouTube embed ou .mp4)</span>
                <input
                  value={aiVideo}
                  onChange={(e) => setAiVideo(e.target.value)}
                  placeholder="https://youtube.com/embed/..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Mode</span>
                <button onClick={() => setAiMode('append')} className={`px-3 py-1 rounded-full text-xs ${aiMode === 'append' ? 'bg-emerald-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>+ Ajouter</button>
                <button onClick={() => setAiMode('replace')} className={`px-3 py-1 rounded-full text-xs ${aiMode === 'replace' ? 'bg-rose-500 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400'}`}>↻ Remplacer</button>
                {blocks.length > 0 && aiMode === 'replace' && <span className="text-rose-400 text-[10px]">⚠ écrase les {blocks.length} blocs actuels</span>}
              </div>
            </div>
            <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex justify-end gap-2">
              <button onClick={() => setShowAi(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
              <button
                onClick={generateAi}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="bg-gradient-to-r from-amber-400 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1.5 shadow-lg"
              >
                {aiGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {aiGenerating ? 'Génération…' : 'Générer'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function BlockSummary({ block }: { block: Block }) {
  if (block.type === 'text') return <p className="text-[11px] text-zinc-400 line-clamp-2">{(block.data?.html || '').replace(/<[^>]+>/g, ' ').slice(0, 200)}</p>;
  if (block.type === 'image') return block.data?.src ? <p className="text-[11px] text-zinc-500 truncate">🖼 {block.data.src}</p> : <p className="text-[11px] text-amber-400">⚠ Image vide</p>;
  if (block.type === 'video') return block.data?.src ? <p className="text-[11px] text-zinc-500 truncate">🎬 {block.data.src}</p> : <p className="text-[11px] text-amber-400">⚠ Vidéo vide</p>;
  if (block.type === 'cta') return <p className="text-[11px] text-zinc-300">→ <strong>{block.data?.label}</strong> : {block.data?.href}</p>;
  if (block.type === 'hero') return <p className="text-[11px] text-zinc-300"><strong>{block.data?.title}</strong> — {block.data?.subtitle}</p>;
  if (block.type === 'parallax-hero') return <p className="text-[11px] text-fuchsia-300">⛰ <strong>{block.data?.title}</strong> · {block.data?.height || '90vh'} · {block.data?.fgImage ? '✓' : '○'}fg / {block.data?.midImage ? '✓' : '○'}mid / {block.data?.bgImage ? '✓' : '○'}bg</p>;
  if (block.type === 'parallax-slider') return <p className="text-[11px] text-cyan-300">📚 {block.data?.slides?.length || 0} slide(s) · {block.data?.autoplay ? 'autoplay' : 'manuel'}</p>;
  if (block.type === 'columns') return <p className="text-[11px] text-zinc-500">{block.data?.columns?.length || 0} colonne(s)</p>;
  if (block.type === 'spacer') return <p className="text-[11px] text-zinc-500">↕ {block.data?.height || 60}px</p>;
  return <p className="text-[11px] text-zinc-500 truncate">{JSON.stringify(block.data).slice(0, 100)}</p>;
}

function PreviewBlock({ block }: { block: Block }) {
  const widthClass: Record<string, string> = {
    '1/4': 'w-1/4', '1/3': 'w-1/3', '1/2': 'w-1/2', '2/3': 'w-2/3', '3/4': 'w-3/4', full: 'w-full'
  };
  const wrapper = `${widthClass[block.width] || 'w-full'} mx-auto`;
  if (block.type === 'text') return <div className={wrapper}><div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.data?.html || '' }} /></div>;
  if (block.type === 'image' && block.data?.src) return <div className={wrapper}><img src={block.data.src} alt={block.data.alt || ''} className="w-full rounded-lg" /></div>;
  if (block.type === 'video' && block.data?.src) return <div className={wrapper}><video src={block.data.src} controls className="w-full rounded-lg" /></div>;
  if (block.type === 'cta') return <div className={`${wrapper} text-center my-3`}><a href={block.data?.href || '#'} className="inline-block bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold px-5 py-2.5 rounded-full">{block.data?.label || 'CTA'}</a></div>;
  if (block.type === 'hero') return (
    <div className={`${wrapper} relative rounded-xl overflow-hidden p-8 text-center`} style={{ background: block.data?.bgImage ? `url(${block.data.bgImage}) center/cover` : 'linear-gradient(135deg, #d946ef, #8b5cf6, #06b6d4)' }}>
      <h1 className="font-display text-3xl font-bold text-white mb-2">{block.data?.title}</h1>
      <p className="text-white/90 mb-4">{block.data?.subtitle}</p>
      {block.data?.cta?.label && <a href={block.data.cta.href || '#'} className="inline-block bg-white text-zinc-900 font-bold px-5 py-2 rounded-full">{block.data.cta.label}</a>}
    </div>
  );
  if (block.type === 'parallax-hero') return (
    <div className={`${wrapper} relative rounded-xl overflow-hidden text-center flex items-center justify-center`}
         style={{ minHeight: 220, background: block.data?.bgGradient || 'linear-gradient(180deg, #1e1b4b, #4c1d95)' }}>
      {block.data?.bgImage && <div className="absolute inset-0 bg-center bg-cover opacity-40" style={{ backgroundImage: `url(${block.data.bgImage})` }} />}
      {block.data?.floatingText && <span className="absolute font-display font-black text-white/10 select-none" style={{ fontSize: 90, lineHeight: 0.9 }}>{block.data.floatingText}</span>}
      <div className="relative z-10 p-6">
        <h1 className="font-display text-2xl md:text-3xl font-black text-white">{block.data?.title}</h1>
        {block.data?.subtitle && <p className="text-white/85 text-sm mt-2">{block.data.subtitle}</p>}
        {block.data?.ctaLabel && <span className="mt-3 inline-block bg-white text-zinc-900 font-bold px-4 py-1.5 rounded-full text-xs">{block.data.ctaLabel}</span>}
      </div>
      <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-bold bg-fuchsia-500/40 text-white px-1.5 py-0.5 rounded">Parallax</span>
    </div>
  );
  if (block.type === 'parallax-slider') {
    const slides = block.data?.slides || [];
    const first = slides[0] || {};
    return (
      <div className={`${wrapper} relative rounded-xl overflow-hidden flex items-stretch`} style={{ minHeight: 200, background: first.bgColor || `linear-gradient(135deg, ${first.accentColor || '#d946ef'}, #0a0a0f 70%)` }}>
        <div className="relative z-10 flex-1 p-6 flex flex-col justify-center">
          {first.tagline && <span className="text-[10px] tracking-[0.4em] text-white/60 uppercase mb-2">{first.tagline}</span>}
          {first.subtitle && <span className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: first.accentColor || '#d946ef' }}>{first.subtitle}</span>}
          <h1 className="font-display text-2xl md:text-3xl font-black text-white">{first.title || 'Titre'}</h1>
        </div>
        {first.image && <div className="w-1/2 bg-cover bg-center" style={{ backgroundImage: `url(${first.image})`, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)' }} />}
        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-bold bg-cyan-500/40 text-white px-1.5 py-0.5 rounded">Slider · {slides.length}</span>
      </div>
    );
  }
  if (block.type === 'columns') return (
    <div className={`${wrapper} grid grid-cols-${block.data?.columns?.length || 2} gap-4`}>
      {(block.data?.columns || []).map((c: any, i: number) => <div key={i} className="prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: c.html || '' }} />)}
    </div>
  );
  if (block.type === 'embed') return <div className={wrapper} dangerouslySetInnerHTML={{ __html: block.data?.html || '' }} />;
  if (block.type === 'spacer') return <div style={{ height: block.data?.height || 60 }} />;
  return null;
}

function BlockEditDrawer({ block, onChange, onChangeData, onClose }: {
  block: Block; onChange: (p: Partial<Block>) => void; onChangeData: (p: any) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-zinc-950 border-l border-fuchsia-500/30 shadow-2xl overflow-y-auto" style={{ animation: 'slideIn 0.25s ease-out' }}>
      <header className="bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between sticky top-0 z-10">
        <h3 className="font-bold text-sm uppercase tracking-wider">Bloc {block.type}</h3>
        <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-white" /></button>
      </header>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Largeur</label>
            <select value={block.width} onChange={(e) => onChange({ width: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs">
              {WIDTH_OPTIONS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Effet · 100 wahoo</label>
            <EffectPicker value={block.effect} onChange={(v) => onChange({ effect: v })} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Délai (ms)</label>
          <input type="number" value={block.effectDelay || 0} onChange={(e) => onChange({ effectDelay: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
        </div>

        {block.type === 'text' && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">HTML</label>
            <textarea value={block.data?.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={10} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>
        )}

        {block.type === 'image' && (
          <>
            <input value={block.data?.src || ''} onChange={(e) => onChangeData({ src: e.target.value })} placeholder="URL image" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input value={block.data?.alt || ''} onChange={(e) => onChangeData({ alt: e.target.value })} placeholder="Alt text" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
          </>
        )}

        {block.type === 'video' && (
          <input value={block.data?.src || ''} onChange={(e) => onChangeData({ src: e.target.value })} placeholder="URL vidéo (mp4 ou YouTube embed)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
        )}

        {block.type === 'cta' && (
          <>
            <input value={block.data?.label || ''} onChange={(e) => onChangeData({ label: e.target.value })} placeholder="Label" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            <input value={block.data?.href || ''} onChange={(e) => onChangeData({ href: e.target.value })} placeholder="Lien" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </>
        )}

        {block.type === 'hero' && (
          <>
            <input value={block.data?.title || ''} onChange={(e) => onChangeData({ title: e.target.value })} placeholder="Titre" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold" />
            <input value={block.data?.subtitle || ''} onChange={(e) => onChangeData({ subtitle: e.target.value })} placeholder="Sous-titre" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            <input value={block.data?.bgImage || ''} onChange={(e) => onChangeData({ bgImage: e.target.value })} placeholder="URL image de fond (optionnel)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </>
        )}

        {block.type === 'parallax-hero' && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold flex items-center gap-1"><Mountain size={11} /> Layers Parallax (Stepout)</p>
            <input value={block.data?.title || ''} onChange={(e) => onChangeData({ title: e.target.value })} placeholder="Titre principal" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold" />
            <input value={block.data?.subtitle || ''} onChange={(e) => onChangeData({ subtitle: e.target.value })} placeholder="Sous-titre" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            <input value={block.data?.floatingText || ''} onChange={(e) => onChangeData({ floatingText: e.target.value })} placeholder='Texte flottant (ex: "EXPLORE")' className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input value={block.data?.ctaLabel || ''} onChange={(e) => onChangeData({ ctaLabel: e.target.value })} placeholder="CTA label" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
              <input value={block.data?.ctaHref || ''} onChange={(e) => onChangeData({ ctaHref: e.target.value })} placeholder="CTA href" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            </div>
            <input value={block.data?.bgImage || ''} onChange={(e) => onChangeData({ bgImage: e.target.value })} placeholder="🏞️ Layer 1 — Image fond (sky, montagnes, lointain)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input value={block.data?.midImage || ''} onChange={(e) => onChangeData({ midImage: e.target.value })} placeholder="⛰️ Layer 2 — Image milieu (collines, nuages)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input value={block.data?.fgImage || ''} onChange={(e) => onChangeData({ fgImage: e.target.value })} placeholder="🌳 Layer 3 — Image foreground (silhouettes, herbes)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <div className="grid grid-cols-2 gap-2">
              <input value={block.data?.height || '90vh'} onChange={(e) => onChangeData({ height: e.target.value })} placeholder="Hauteur (90vh)" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
              <input value={block.data?.overlayColor || ''} onChange={(e) => onChangeData({ overlayColor: e.target.value })} placeholder="Overlay (rgba(0,0,0,0.25))" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            </div>
            <input value={block.data?.bgGradient || ''} onChange={(e) => onChangeData({ bgGradient: e.target.value })} placeholder="Gradient si pas de bgImage" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <p className="text-[10px] text-zinc-500 italic">💡 Astuce : utilise des PNG transparents pour midImage et fgImage. Ils glissent à des vitesses différentes au scroll.</p>
          </div>
        )}

        {block.type === 'parallax-slider' && (
          <ParallaxSliderEditor data={block.data || {}} onChange={(data) => onChangeData(data)} />
        )}

        {block.type === 'spacer' && (
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Hauteur (px)</label>
            <input type="number" value={block.data?.height || 60} onChange={(e) => onChangeData({ height: Number(e.target.value) })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
          </div>
        )}

        {block.type === 'embed' && (
          <textarea value={block.data?.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={8} placeholder="<iframe ...> ou code HTML custom" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }` }} />
    </div>
  );
}

/* ─── Picker des 100 effets ────────────────────────── */
function EffectPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EffectCategory>('entry');
  const [search, setSearch] = useState('');
  const selected = value ? EFFECTS.find((e) => e.id === value) : null;
  const filtered = search
    ? EFFECTS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search.toLowerCase()))
    : EFFECTS.filter((e) => e.category === tab);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500 rounded-lg px-2 py-2 text-xs flex items-center justify-between gap-2"
      >
        {selected ? (
          <span className="flex items-center gap-1.5 truncate">
            <span>{selected.emoji || '✨'}</span>
            <span className="truncate">{selected.name}</span>
            {selected.intensity === 'wow' && <span className="text-[8px] px-1 py-0.5 rounded bg-fuchsia-500/30 text-fuchsia-300 font-bold">WOW</span>}
          </span>
        ) : (
          <span className="text-zinc-500">Aucun effet</span>
        )}
        <Sparkles size={11} className="text-fuchsia-400" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-fuchsia-500/30 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <header className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center gap-3">
              <Sparkles size={16} className="text-fuchsia-400" />
              <h3 className="font-bold text-sm">100 effets wahoo</h3>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs w-48" autoFocus />
                </div>
                <button onClick={() => { onChange(null); setOpen(false); }} className="text-xs text-zinc-400 hover:text-white px-2">Aucun</button>
                <button onClick={() => setOpen(false)}><X size={16} className="text-zinc-400 hover:text-white" /></button>
              </div>
            </header>
            {!search && (
              <nav className="bg-zinc-900/50 border-b border-zinc-800 flex flex-wrap gap-1 p-2">
                {EFFECT_CATEGORIES.map((cat) => {
                  const count = EFFECTS.filter((e) => e.category === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setTab(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
                        tab === cat.id ? 'bg-fuchsia-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      {cat.label}
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </nav>
            )}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {filtered.length === 0 ? (
                <p className="col-span-full text-center text-xs text-zinc-500 py-8">Aucun effet trouvé.</p>
              ) : filtered.map((fx) => (
                <button
                  key={fx.id}
                  onClick={() => { onChange(fx.id); setOpen(false); setSearch(''); }}
                  className={`flex flex-col items-start gap-1 p-2 rounded-lg border text-left transition ${
                    value === fx.id
                      ? 'bg-fuchsia-500/15 border-fuchsia-500 ring-1 ring-fuchsia-500'
                      : 'bg-zinc-900 border-zinc-800 hover:border-fuchsia-500/60 hover:bg-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-base">{fx.emoji || '✨'}</span>
                    <span className="text-xs font-bold text-white truncate flex-1">{fx.name}</span>
                    {fx.intensity === 'wow' && <span className="text-[8px] px-1 rounded bg-fuchsia-500/30 text-fuchsia-300 font-bold">WOW</span>}
                  </div>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{fx.desc}</p>
                  <code className="text-[9px] text-zinc-600 truncate w-full">{fx.id}</code>
                </button>
              ))}
            </div>
            <footer className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>{filtered.length} / 100 effets</span>
              <span className="flex items-center gap-1"><Sparkles size={10} className="text-fuchsia-400" /> Bibliothèque GLD</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Editor pour Parallax Slider ─────────────────── */
/* ─── Modale Import live page (Replace / Append + Intensity) ────── */
function ImportPageModal({ slug, existingBlocks, importing, verifying, verifyResult, onVerify, onImport, onClose }: {
  slug: string;
  existingBlocks: number;
  importing: boolean;
  verifying: boolean;
  verifyResult: any;
  onVerify: () => void;
  onImport: (mode: 'replace' | 'append', intensity: 'none' | 'subtle' | 'medium' | 'wow') => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'replace' | 'append'>(existingBlocks > 0 ? 'append' : 'replace');
  const [intensity, setIntensity] = useState<'none' | 'subtle' | 'medium' | 'wow'>('subtle');

  const INTENSITIES = [
    { v: 'none',   label: 'Aucun',  emoji: '⚪', desc: 'Pas d\'animation, perf max' },
    { v: 'subtle', label: 'Sobre',  emoji: '🌱', desc: 'Fade-up doux, recommandé' },
    { v: 'medium', label: 'Moyen',  emoji: '✨', desc: 'Zoom, bounce sur CTA' },
    { v: 'wow',    label: 'Wow',    emoji: '🎆', desc: 'Effets spectaculaires' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-cyan-500/40 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <header className="bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-b border-cyan-500/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-xl">📥</div>
          <div>
            <h3 className="text-base font-bold text-white">Importer /{slug}</h3>
            <p className="text-[11px] text-zinc-300">Convertit le HTML rendu en blocs éditables</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white"><X size={16} /></button>
        </header>

        <div className="p-4 space-y-4">
          {existingBlocks > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
              ⚠️ Cette page a <strong>{existingBlocks} bloc(s)</strong> déjà créés. Choisis le mode adapté ci-dessous.
            </div>
          )}

          {/* Mode */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Mode d'import</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('append')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'append' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-emerald-500/40'
                }`}
              >
                <p className="text-xs font-bold text-white">➕ Ajouter</p>
                <p className="text-[10px] text-zinc-500">Conserve les {existingBlocks} blocs et ajoute le nouveau contenu à la fin</p>
              </button>
              <button
                onClick={() => setMode('replace')}
                className={`p-3 rounded-xl border text-left transition ${
                  mode === 'replace' ? 'border-rose-500 bg-rose-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-rose-500/40'
                }`}
              >
                <p className="text-xs font-bold text-white">↻ Remplacer</p>
                <p className="text-[10px] text-zinc-500">{existingBlocks > 0 ? `Supprime les ${existingBlocks} blocs et` : 'Recrée tout'} le contenu depuis zéro</p>
              </button>
            </div>
          </div>

          {/* Intensité effets */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Intensité des effets</label>
            <div className="grid grid-cols-4 gap-1.5">
              {INTENSITIES.map((i) => (
                <button
                  key={i.v}
                  onClick={() => setIntensity(i.v as any)}
                  className={`p-2 rounded-lg border text-left transition ${
                    intensity === i.v ? 'border-fuchsia-500 bg-fuchsia-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-fuchsia-500/40'
                  }`}
                >
                  <div className="text-base">{i.emoji}</div>
                  <p className="text-[10px] font-bold text-white">{i.label}</p>
                  <p className="text-[9px] text-zinc-500 leading-tight">{i.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Verify */}
          <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-zinc-300 font-bold">🔍 Vérification (recommandé avant import)</p>
              <button onClick={onVerify} disabled={verifying} className="text-[10px] bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 px-2 py-1 rounded disabled:opacity-50 flex items-center gap-1">
                {verifying ? <Loader2 size={9} className="animate-spin" /> : <RefreshCw size={9} />}
                {verifying ? 'Vérification…' : 'Vérifier'}
              </button>
            </div>
            {verifyResult ? (
              <div className="space-y-1.5">
                <p className={`text-[11px] font-bold ${verifyResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {verifyResult.diagnostic}
                </p>
                <ul className="space-y-0.5">
                  {(verifyResult.checks || []).map((c: any, i: number) => (
                    <li key={i} className={`text-[10px] flex items-start gap-1 ${c.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                      <span>{c.ok ? '✓' : '✗'}</span>
                      <span>{c.message}</span>
                    </li>
                  ))}
                </ul>
                {verifyResult.blocksPreview && (
                  <p className="text-[10px] text-zinc-500 mt-2">
                    Blocs détectés (preview) : {verifyResult.blocksPreview.map((b: any) => b.type).join(' → ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-zinc-500">Clique 'Vérifier' pour tester fetch + parsing + écriture DB sans rien modifier.</p>
            )}
          </div>
        </div>

        <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-2">
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
          <button
            onClick={() => onImport(mode, intensity)}
            disabled={importing}
            className={`ml-auto text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1.5 shadow-lg ${
              mode === 'replace'
                ? 'bg-rose-500 hover:bg-rose-400'
                : 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-90'
            } disabled:opacity-50`}
          >
            {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            {importing ? 'Import…' : `${mode === 'replace' ? '↻ Remplacer' : '➕ Ajouter'} avec effets ${intensity}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

function ParallaxSliderEditor({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const slides: any[] = data.slides || [];

  function updateSlide(idx: number, patch: any) {
    const next = slides.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...data, slides: next });
  }
  function addSlide() {
    onChange({
      ...data,
      slides: [
        ...slides,
        { title: 'Nouvelle slide', subtitle: '', tagline: `0${slides.length + 1} / 0${slides.length + 1}`, image: '', accentColor: '#d946ef' }
      ]
    });
  }
  function removeSlide(idx: number) {
    onChange({ ...data, slides: slides.filter((_, i) => i !== idx) });
  }
  function moveSlide(from: number, to: number) {
    const next = [...slides];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange({ ...data, slides: next });
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold flex items-center gap-1"><Layers size={11} /> Slides ({slides.length})</p>

      <div className="grid grid-cols-3 gap-2">
        <input value={data.height || '85vh'} onChange={(e) => onChange({ ...data, height: e.target.value })} placeholder="Hauteur" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
        <label className="flex items-center gap-1 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5">
          <input type="checkbox" checked={data.autoplay !== false} onChange={(e) => onChange({ ...data, autoplay: e.target.checked })} /> autoplay
        </label>
        <input type="number" value={data.autoplayDelay || 6500} onChange={(e) => onChange({ ...data, autoplayDelay: Number(e.target.value) })} placeholder="Delay (ms)" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
      </div>

      {slides.map((s, i) => (
        <article key={i} className="bg-zinc-950 border border-zinc-800 rounded-xl p-2 space-y-1.5">
          <header className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-cyan-400">Slide {i + 1}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => i > 0 && moveSlide(i, i - 1)} disabled={i === 0} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowUp size={10} /></button>
              <button onClick={() => i < slides.length - 1 && moveSlide(i, i + 1)} disabled={i === slides.length - 1} className="p-1 text-zinc-500 hover:text-zinc-200 disabled:opacity-30"><ArrowDown size={10} /></button>
              <button onClick={() => confirm('Supprimer cette slide ?') && removeSlide(i)} className="p-1 text-rose-400 hover:text-rose-300"><Trash2 size={10} /></button>
            </div>
          </header>
          <input value={s.title || ''} onChange={(e) => updateSlide(i, { title: e.target.value })} placeholder="Titre" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-bold" />
          <div className="grid grid-cols-2 gap-1.5">
            <input value={s.subtitle || ''} onChange={(e) => updateSlide(i, { subtitle: e.target.value })} placeholder="Sous-titre" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs" />
            <input value={s.tagline || ''} onChange={(e) => updateSlide(i, { tagline: e.target.value })} placeholder="Tagline (01/03)" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
          </div>
          <input value={s.image || ''} onChange={(e) => updateSlide(i, { image: e.target.value })} placeholder="URL image" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
          <div className="grid grid-cols-3 gap-1.5">
            <input value={s.ctaLabel || ''} onChange={(e) => updateSlide(i, { ctaLabel: e.target.value })} placeholder="CTA" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs" />
            <input value={s.ctaHref || ''} onChange={(e) => updateSlide(i, { ctaHref: e.target.value })} placeholder="Lien" className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
              <input type="color" value={s.accentColor || '#d946ef'} onChange={(e) => updateSlide(i, { accentColor: e.target.value })} className="w-5 h-5 cursor-pointer bg-transparent border-0 rounded" />
              <input value={s.accentColor || ''} onChange={(e) => updateSlide(i, { accentColor: e.target.value })} placeholder="Accent" className="flex-1 bg-transparent text-[10px] font-mono outline-none" />
            </div>
          </div>
        </article>
      ))}

      <button onClick={addSlide} className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-dashed border-cyan-500/40 hover:border-cyan-500 text-cyan-300 hover:text-cyan-200 rounded-xl px-3 py-2 text-xs flex items-center justify-center gap-1.5">
        <Plus size={11} /> Ajouter une slide
      </button>
    </div>
  );
}
