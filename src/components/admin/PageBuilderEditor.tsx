'use client';
import { useEffect, useState } from 'react';
import {
  Type, Image as ImageIcon, Video as VideoIcon, Layout, Square, Columns, Code as CodeIcon,
  Loader2, Save, Trash2, GripVertical, Plus, ArrowUp, ArrowDown, X, Eye, MousePointer
} from 'lucide-react';

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
  { type: 'text',    icon: Type,       label: 'Texte',     color: 'sky' },
  { type: 'image',   icon: ImageIcon,  label: 'Image',     color: 'fuchsia' },
  { type: 'video',   icon: VideoIcon,  label: 'Vidéo',     color: 'rose' },
  { type: 'cta',     icon: MousePointer, label: 'CTA',     color: 'amber' },
  { type: 'hero',    icon: Layout,     label: 'Hero',      color: 'violet' },
  { type: 'columns', icon: Columns,    label: 'Colonnes',  color: 'emerald' },
  { type: 'embed',   icon: CodeIcon,   label: 'Embed',     color: 'cyan' },
  { type: 'spacer',  icon: Square,     label: 'Espace',    color: 'zinc' }
];

const WIDTH_OPTIONS = [
  { v: '1/4',  label: '¼' },
  { v: '1/3',  label: '⅓' },
  { v: '1/2',  label: '½' },
  { v: '2/3',  label: '⅔' },
  { v: '3/4',  label: '¾' },
  { v: 'full', label: '100%' }
];

const EFFECT_OPTIONS = [
  { v: '',           label: 'Aucun' },
  { v: 'fade',       label: 'Fade in' },
  { v: 'slide-up',   label: 'Slide ↑' },
  { v: 'slide-left', label: 'Slide ←' },
  { v: 'scale',      label: 'Scale' },
  { v: 'parallax',   label: 'Parallax' }
];

export function PageBuilderEditor({ slug }: { slug: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/page-builder/${slug}`, { cache: 'no-store' });
    const j = await r.json();
    setBlocks(j.blocks || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  function addBlock(type: string) {
    const defaultData: any = {
      text:    { html: '<h2>Titre</h2><p>Ton paragraphe ici…</p>' },
      image:   { src: '', alt: '' },
      video:   { src: '' },
      cta:     { label: 'Cliquer ici', href: '/' },
      hero:    { title: 'Titre Hero', subtitle: 'Sous-titre', cta: { label: 'CTA', href: '/' }, bgImage: '' },
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
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3 flex items-center gap-3 sticky top-3 z-30 backdrop-blur">
        <a href="/admin/page-builder" className="text-xs text-zinc-400 hover:text-white">← Pages</a>
        <code className="text-xs text-zinc-300 bg-zinc-950 px-2 py-1 rounded">/{slug}</code>
        <span className="text-xs text-zinc-500">{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
        <div className="ml-auto flex items-center gap-2">
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200">↗ Voir page</a>
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
            <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
              <Layout size={36} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-300 font-bold mb-1">Page vide</p>
              <p className="text-xs text-zinc-500">Ajoute ton premier bloc en cliquant sur un type ci-dessus.</p>
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

        {/* Preview live */}
        {showPreview && (
          <div className="bg-zinc-950 ring-1 ring-zinc-800 rounded-2xl overflow-hidden sticky top-20 self-start" style={{ maxHeight: '80vh' }}>
            <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1"><Eye size={11} /> Preview</header>
            <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '74vh' }}>
              {blocks.filter((b) => b.visible).map((b, i) => <PreviewBlock key={i} block={b} />)}
            </div>
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
    </div>
  );
}

function BlockSummary({ block }: { block: Block }) {
  if (block.type === 'text') return <p className="text-[11px] text-zinc-400 line-clamp-2">{(block.data?.html || '').replace(/<[^>]+>/g, ' ').slice(0, 200)}</p>;
  if (block.type === 'image') return block.data?.src ? <p className="text-[11px] text-zinc-500 truncate">🖼 {block.data.src}</p> : <p className="text-[11px] text-amber-400">⚠ Image vide</p>;
  if (block.type === 'video') return block.data?.src ? <p className="text-[11px] text-zinc-500 truncate">🎬 {block.data.src}</p> : <p className="text-[11px] text-amber-400">⚠ Vidéo vide</p>;
  if (block.type === 'cta') return <p className="text-[11px] text-zinc-300">→ <strong>{block.data?.label}</strong> : {block.data?.href}</p>;
  if (block.type === 'hero') return <p className="text-[11px] text-zinc-300"><strong>{block.data?.title}</strong> — {block.data?.subtitle}</p>;
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
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Effet</label>
            <select value={block.effect || ''} onChange={(e) => onChange({ effect: e.target.value || null })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-2 text-xs">
              {EFFECT_OPTIONS.map((e) => <option key={e.v} value={e.v}>{e.label}</option>)}
            </select>
          </div>
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
