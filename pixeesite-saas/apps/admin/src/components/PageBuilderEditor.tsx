'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EFFECTS, EFFECT_CATEGORIES, type Effect, type EffectCategory,
  PageBlocksRenderer, EffectsStyles, GoogleFontsLoader,
  type SiteTheme, type Block as RendererBlock,
} from '@pixeesite/blocks';
import { MediaLibrary, MediaLibraryToolbarButton, type MediaResult } from './MediaLibrary';

export interface Block {
  id?: string;
  position?: number;
  width: string;
  type: string;
  data: any;
  effect?: string | null;
  effectDelay?: number | null;
  visible?: boolean;
}

const BLOCK_TYPES = [
  { type: 'parallax-hero',  emoji: '⛰', label: 'Parallax Hero',  defaultData: { title: 'Mon titre', subtitle: 'Sous-titre inspirant', ctaLabel: 'Découvrir', ctaHref: '#contenu', floatingText: 'EXPLORE', height: '90vh', bgGradient: 'linear-gradient(180deg, #1e1b4b, #4c1d95, #d946ef)' } },
  { type: 'parallax-slider', emoji: '🎞', label: 'Parallax Slider', defaultData: { slides: [{ title: 'Slide 1', subtitle: 'Description', tagline: '01 / 03', accentColor: '#d946ef' }], height: '85vh', autoplay: true, autoplayDelay: 6500 } },
  { type: 'hero',           emoji: '🎯', label: 'Hero',           defaultData: { title: 'Mon titre', subtitle: 'Sous-titre' } },
  { type: 'text',           emoji: '📝', label: 'Texte',          defaultData: { html: '<h2>Titre</h2><p>Mon texte ici…</p>' } },
  { type: 'image',          emoji: '🖼', label: 'Image',          defaultData: { src: '', alt: '' } },
  { type: 'video',          emoji: '🎬', label: 'Vidéo',          defaultData: { src: '' } },
  { type: 'cta',            emoji: '🔘', label: 'CTA',            defaultData: { label: 'Cliquer', href: '/' } },
  { type: 'columns',        emoji: '📋', label: 'Colonnes',       defaultData: { columns: [{ html: '<p>Col 1</p>' }, { html: '<p>Col 2</p>' }] } },
  { type: 'embed',          emoji: '📺', label: 'Embed HTML',     defaultData: { html: '<!-- iframe ou code -->' } },
  { type: 'spacer',         emoji: '⬜', label: 'Espace',         defaultData: { height: 60 } },
];

const WIDTH_OPTIONS = [
  { v: '1/4', l: '¼' }, { v: '1/3', l: '⅓' }, { v: '1/2', l: '½' },
  { v: '2/3', l: '⅔' }, { v: '3/4', l: '¾' }, { v: 'full', l: '100%' },
];

interface Props {
  orgSlug: string;
  siteSlug: string;
  siteName: string;
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  initialBlocks: Block[];
  allPages: { id: string; slug: string; title: string; isHome: boolean }[];
  orgDefaultDomain: string | null;
  theme: { primary: string; font: string };
  canEdit: boolean;
}

export function PageBuilderEditor(props: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(props.initialBlocks);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // 'preview' = rendu live via <PageBlocksRenderer> avec les blocs en cours d'édition (INSTANTANÉ).
  // 'live'    = iframe vers le site déployé (nécessite Save + reload pour voir les changements).
  // 'blocks'  = aperçu compact des cards (mode dev).
  const [previewMode, setPreviewMode] = useState<'preview' | 'live' | 'blocks'>('preview');
  const [iframeKey, setIframeKey] = useState(0);
  const [mediaLibOpen, setMediaLibOpen] = useState(false);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  /** Applique un média sur un bloc en fonction du type. */
  function applyMediaToBlock(idx: number, m: MediaResult, useAs?: string) {
    const block = blocks[idx];
    if (!block) return;
    const target = useAs || block.type;
    if (target === 'parallax-hero' || target === 'hero') {
      updateData(idx, m.type === 'video' ? { bgVideo: m.url, alt: m.alt } : { bgImage: m.url, alt: m.alt });
    } else if (target === 'parallax-slider') {
      const slides = Array.isArray(block.data?.slides) ? [...block.data.slides] : [];
      slides[0] = { ...(slides[0] || {}), image: m.url, alt: m.alt };
      updateData(idx, { slides });
    } else if (target === 'gallery') {
      const items = Array.isArray(block.data?.items) ? [...block.data.items] : [];
      items.push({ src: m.url, alt: m.alt });
      updateData(idx, { items });
    } else if (target === 'cta-banner') {
      updateData(idx, { bgImage: m.url, alt: m.alt });
    } else if (block.type === 'video' || m.type === 'video' || m.type === 'youtube') {
      updateData(idx, { src: m.url });
    } else {
      updateData(idx, { src: m.url, alt: m.alt || block.data?.alt || '' });
    }
  }

  /** Insertion depuis la lib quand pas de bloc édité : crée un bloc image/video. */
  function insertMediaAsBlock(m: MediaResult, useAs?: string) {
    if (editingIdx != null) {
      applyMediaToBlock(editingIdx, m, useAs);
      return;
    }
    // Crée un bloc selon le type
    const newBlock: Block = {
      position: blocks.length,
      width: 'full',
      type: useAs === 'parallax-hero' ? 'parallax-hero'
        : useAs === 'parallax-slider' ? 'parallax-slider'
        : useAs === 'cta-banner' ? 'cta'
        : m.type === 'video' || m.type === 'youtube' ? 'video'
        : 'image',
      data: {},
      effect: 'fade-up',
      effectDelay: blocks.length * 100,
      visible: true,
    };
    if (newBlock.type === 'parallax-hero') {
      newBlock.data = { title: 'Titre', subtitle: '', bgImage: m.url, height: '90vh' };
    } else if (newBlock.type === 'parallax-slider') {
      newBlock.data = { slides: [{ image: m.url, title: 'Slide 1', alt: m.alt }], height: '85vh' };
    } else if (newBlock.type === 'video') {
      newBlock.data = { src: m.url };
    } else {
      newBlock.data = { src: m.url, alt: m.alt || '' };
    }
    setBlocks((prev) => [...prev, newBlock]);
    setEditingIdx(blocks.length);
  }

  // Theme dérivé des props (primaryColor + font choisis dans le wizard).
  // Sert au rendu du mode "Preview live" pour matcher le site déployé.
  const previewTheme: SiteTheme = {
    primary: props.theme?.primary || '#d946ef',
    fontHeading: props.theme?.font ? `"${props.theme.font}", system-ui, sans-serif` : undefined,
    fontBody: props.theme?.font ? `"${props.theme.font}", system-ui, sans-serif` : undefined,
    fontHeadingName: props.theme?.font || undefined,
    fontBodyName: props.theme?.font || undefined,
  };

  // URL publique : <orgSlug>.pixeeplay.com/<siteSlug>[/page]
  // Fallback orgDefaultDomain si custom domain configuré, sinon localhost en dev
  const pagePath = props.pageSlug === '/' ? '' : props.pageSlug;
  const livePreviewUrl = props.orgDefaultDomain && !props.orgDefaultDomain.endsWith('.pixeesite.app')
    ? `https://${props.orgDefaultDomain}/${props.siteSlug}${pagePath}`
    : typeof window !== 'undefined' && window.location.hostname.includes('localhost')
      ? `http://localhost:3001/${props.siteSlug}${pagePath}?org=${props.orgSlug}`
      : `https://${props.orgSlug}.pixeeplay.com/${props.siteSlug}${pagePath}`;

  // Auto-save toutes les 30s si modifs
  useEffect(() => {
    const dirty = JSON.stringify(blocks) !== JSON.stringify(props.initialBlocks);
    if (!dirty) return;
    const t = setTimeout(() => save(true), 30000);
    return () => clearTimeout(t);
  }, [blocks]);

  function addBlock(type: string) {
    const meta = BLOCK_TYPES.find((b) => b.type === type);
    if (!meta) return;
    setBlocks((prev) => [...prev, {
      position: prev.length,
      width: 'full',
      type,
      data: { ...meta.defaultData },
      effect: 'fade-up',
      effectDelay: prev.length * 100,
      visible: true,
    }]);
    setEditingIdx(blocks.length);
  }

  function updateBlock(idx: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  }
  function updateData(idx: number, dataPatch: any) {
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
    if (!confirm('Supprimer ce bloc ?')) return;
    setBlocks((prev) => prev.filter((_, i) => i !== idx).map((b, i) => ({ ...b, position: i })));
    setEditingIdx(null);
  }

  async function save(isAuto = false) {
    if (!props.canEdit) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/orgs/${props.orgSlug}/sites/${props.siteSlug}/pages/${props.pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks, snapshotBefore: !isAuto }),
      });
      if (r.ok) {
        setSavedAt(new Date());
        if (!isAuto) router.refresh();
      }
    } catch (e: any) {
      if (!isAuto) alert('Erreur : ' + e.message);
    }
    setSaving(false);
  }

  const editingBlock = editingIdx != null ? blocks[editingIdx] : null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#09090b', color: '#fafafa' }}>
      {/* ─── Sidebar pages ─── */}
      <aside style={{ width: 220, background: '#18181b', borderRight: '1px solid #27272a', padding: 12, overflow: 'auto' }}>
        <Link href={`/dashboard/orgs/${props.orgSlug}/sites/${props.siteSlug}`} style={{ fontSize: 12, color: '#a1a1aa', textDecoration: 'none', display: 'block', marginBottom: 12 }}>← {props.siteName}</Link>
        <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 1 }}>Pages</div>
        {props.allPages.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/orgs/${props.orgSlug}/sites/${props.siteSlug}/edit?page=${encodeURIComponent(p.slug)}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, fontSize: 13,
              textDecoration: 'none',
              color: p.id === props.pageId ? '#d946ef' : '#a1a1aa',
              background: p.id === props.pageId ? '#d946ef15' : 'transparent',
              fontWeight: p.id === props.pageId ? 600 : 400,
            }}
          >
            <span>{p.isHome ? '🏠' : '📄'}</span> {p.title}
          </Link>
        ))}
      </aside>

      {/* ─── Editor ─── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#18181b', borderBottom: '1px solid #27272a' }}>
          <div>
            <div style={{ fontWeight: 600 }}>{props.pageTitle}</div>
            <code style={{ fontSize: 11, opacity: 0.5 }}>{props.pageSlug}</code>
          </div>
          <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>{blocks.length} bloc{blocks.length > 1 ? 's' : ''}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {savedAt && <span style={{ fontSize: 11, color: '#10b981' }}>✓ Sauvé {savedAt.toLocaleTimeString('fr-FR')}</span>}
            <a href={livePreviewUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#06b6d4', textDecoration: 'none' }}>↗ Voir live</a>
            {props.canEdit && <MediaLibraryToolbarButton onClick={() => setMediaLibOpen(true)} />}
            {props.canEdit && (
              <button onClick={() => save()} disabled={saving} style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', border: 0, padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Sauvegarde…' : '💾 Enregistrer'}
              </button>
            )}
          </div>
        </div>

        {/* Block palette */}
        {props.canEdit && (
          <div style={{ display: 'flex', gap: 4, padding: 8, background: '#27272a', borderBottom: '1px solid #3f3f46', overflowX: 'auto' }}>
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addBlock(bt.type)}
                style={{ background: '#0a0a0f', border: '1px solid #3f3f46', color: 'inherit', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {bt.emoji} {bt.label}
              </button>
            ))}
          </div>
        )}

        {/* Body : list + preview */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 0 }}>
          {/* Liste blocs */}
          <div style={{ overflow: 'auto', padding: 12, borderRight: '1px solid #27272a' }}>
            {blocks.length === 0 ? (
              <div style={{ background: '#18181b', border: '2px dashed #27272a', borderRadius: 12, padding: 32, textAlign: 'center', opacity: 0.6 }}>
                Page vide. Ajoute un bloc avec la palette ↑
              </div>
            ) : (
              blocks.map((b, i) => (
                <article
                  key={i}
                  draggable={props.canEdit}
                  onDragStart={() => setDraggedIdx(i)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    // Détecte drop média (depuis MediaLibrary)
                    const types = e.dataTransfer.types;
                    if (types.includes('application/x-pxs-media') || types.includes('text/plain')) {
                      setDropTargetIdx(i);
                      e.dataTransfer.dropEffect = 'copy';
                    }
                  }}
                  onDragLeave={() => setDropTargetIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropTargetIdx(null);
                    // 1) Drop média venant de la lib
                    const mediaJson = e.dataTransfer.getData('application/x-pxs-media');
                    if (mediaJson) {
                      try {
                        const m: MediaResult = JSON.parse(mediaJson);
                        applyMediaToBlock(i, m);
                        setEditingIdx(i);
                        return;
                      } catch {}
                    }
                    const txt = e.dataTransfer.getData('text/plain');
                    if (txt && /^https?:\/\//.test(txt)) {
                      // URL nue → apply comme image/src
                      applyMediaToBlock(i, { id: 'drop', type: 'photo', url: txt, thumb: txt, source: 'local' } as any);
                      setEditingIdx(i);
                      return;
                    }
                    // 2) Sinon reorder de blocs
                    if (draggedIdx != null && draggedIdx !== i) moveBlock(draggedIdx, i);
                    setDraggedIdx(null);
                  }}
                  onClick={() => setEditingIdx(i)}
                  style={{
                    background: dropTargetIdx === i ? '#d946ef22' : '#18181b',
                    border: dropTargetIdx === i
                      ? '2px dashed #d946ef'
                      : editingIdx === i ? '1px solid #d946ef' : '1px solid #27272a',
                    borderRadius: 10, padding: 10, marginBottom: 6, cursor: 'pointer',
                    opacity: draggedIdx === i ? 0.3 : (b.visible === false ? 0.5 : 1),
                    transition: 'background .15s, border-color .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ opacity: 0.4 }}>⋮⋮</span>
                    <span style={{ background: '#27272a', padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase' }}>{b.type}</span>
                    <span style={{ opacity: 0.5 }}>{b.width} {b.effect && `· ${b.effect}`}</span>
                    {props.canEdit && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                        <button onClick={(e) => { e.stopPropagation(); updateBlock(i, { visible: !b.visible }); }} style={iconBtn}>{b.visible !== false ? '👁' : '🚫'}</button>
                        <button onClick={(e) => { e.stopPropagation(); if (i > 0) moveBlock(i, i - 1); }} style={iconBtn}>↑</button>
                        <button onClick={(e) => { e.stopPropagation(); if (i < blocks.length - 1) moveBlock(i, i + 1); }} style={iconBtn}>↓</button>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(i); }} style={{ ...iconBtn, color: '#f43f5e' }}>🗑</button>
                      </div>
                    )}
                  </div>
                  <BlockSummary block={b} />
                </article>
              ))
            )}
          </div>

          {/* Preview */}
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 4, padding: 8, background: '#18181b', borderBottom: '1px solid #27272a', position: 'sticky', top: 0, zIndex: 2 }}>
              <button
                onClick={() => setPreviewMode('preview')}
                title="Rendu instantané des modifs en cours (PageBlocksRenderer)"
                style={{ background: previewMode === 'preview' ? 'linear-gradient(135deg,#d946ef,#06b6d4)' : 'transparent', color: previewMode === 'preview' ? 'white' : '#a1a1aa', border: 0, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
              >
                🎨 Preview live
              </button>
              <button
                onClick={() => setPreviewMode('live')}
                title="iframe vers le site déployé (nécessite Save)"
                style={{ background: previewMode === 'live' ? '#d946ef' : 'transparent', color: previewMode === 'live' ? 'white' : '#a1a1aa', border: 0, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
              >
                🌐 Site déployé
              </button>
              <button
                onClick={() => setPreviewMode('blocks')}
                title="Liste compacte des blocs (dev)"
                style={{ background: previewMode === 'blocks' ? '#d946ef' : 'transparent', color: previewMode === 'blocks' ? 'white' : '#a1a1aa', border: 0, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
              >
                🧩 Blocs ({blocks.length})
              </button>
              {previewMode === 'live' && (
                <button onClick={() => setIframeKey((k) => k + 1)} style={{ marginLeft: 'auto', background: 'transparent', color: '#a1a1aa', border: 0, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>🔄</button>
              )}
            </div>
            {previewMode === 'preview' ? (
              <div style={{ flex: 1, overflow: 'auto', background: '#0a0a0f' }}>
                <GoogleFontsLoader theme={previewTheme} />
                <EffectsStyles />
                <PageBlocksRenderer
                  blocks={blocks.filter((b) => b.visible !== false) as RendererBlock[]}
                  theme={previewTheme}
                />
              </div>
            ) : previewMode === 'live' ? (
              <iframe key={iframeKey} src={livePreviewUrl} style={{ flex: 1, border: 0, background: 'white' }} />
            ) : (
              <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#0a0a0f' }}>
                {blocks.filter((b) => b.visible !== false).map((b, i) => <PreviewBlock key={i} block={b} />)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── Drawer édition ─── */}
      {editingBlock && editingIdx != null && (
        <BlockEditDrawer
          block={editingBlock}
          orgSlug={props.orgSlug}
          onChange={(patch) => updateBlock(editingIdx, patch)}
          onChangeData={(patch) => updateData(editingIdx, patch)}
          onClose={() => setEditingIdx(null)}
        />
      )}

      {/* ─── Media Library ─── */}
      <MediaLibrary
        orgSlug={props.orgSlug}
        suggestions={[props.siteName, props.pageTitle].filter(Boolean) as string[]}
        open={mediaLibOpen}
        onClose={() => setMediaLibOpen(false)}
        onInsert={(m, useAs) => insertMediaAsBlock(m, useAs)}
      />
    </div>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'transparent', border: 0, color: '#a1a1aa', padding: 2, fontSize: 11, cursor: 'pointer', borderRadius: 4,
};

function BlockSummary({ block }: { block: Block }) {
  const d = block.data || {};
  if (block.type === 'text') return <p style={{ fontSize: 11, opacity: 0.7, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(d.html || '').replace(/<[^>]+>/g, ' ').slice(0, 80)}</p>;
  if (block.type === 'image' || block.type === 'video') return d.src ? <p style={{ fontSize: 11, opacity: 0.5, margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.src}</p> : <p style={{ fontSize: 11, color: '#fbbf24', margin: '4px 0 0' }}>⚠ Vide</p>;
  if (block.type === 'cta') return <p style={{ fontSize: 11, margin: '4px 0 0' }}>→ {d.label} ({d.href})</p>;
  if (block.type === 'hero' || block.type === 'parallax-hero') return <p style={{ fontSize: 11, margin: '4px 0 0', fontWeight: 600 }}>{d.title}</p>;
  if (block.type === 'parallax-slider') return <p style={{ fontSize: 11, opacity: 0.5, margin: '4px 0 0' }}>{d.slides?.length || 0} slide(s)</p>;
  if (block.type === 'columns') return <p style={{ fontSize: 11, opacity: 0.5, margin: '4px 0 0' }}>{d.columns?.length || 0} col(s)</p>;
  return null;
}

function PreviewBlock({ block }: { block: Block }) {
  const d = block.data || {};
  const wStyle = block.width === 'full' ? 'block' : 'inline-block';
  if (block.type === 'text') return <div style={{ marginBottom: 12, color: '#fafafa' }} dangerouslySetInnerHTML={{ __html: d.html || '' }} />;
  if (block.type === 'image' && d.src) return <img src={d.src} alt={d.alt || ''} style={{ width: '100%', borderRadius: 8, marginBottom: 12, display: wStyle as any }} />;
  if (block.type === 'video' && d.src) return <p style={{ fontSize: 11, opacity: 0.5 }}>🎬 {d.src}</p>;
  if (block.type === 'cta') return <div style={{ textAlign: 'center', margin: '12px 0' }}><span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 13 }}>{d.label}</span></div>;
  if (block.type === 'hero' || block.type === 'parallax-hero') return (
    <div style={{ background: d.bgImage ? `url(${d.bgImage}) center/cover` : (d.bgGradient || 'linear-gradient(135deg, #d946ef, #06b6d4)'), padding: 32, borderRadius: 12, marginBottom: 12, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {d.floatingText && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 900, color: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }}>{d.floatingText}</div>}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h2 style={{ color: 'white', fontSize: 24, margin: '0 0 8px', fontWeight: 800 }}>{d.title}</h2>
        {d.subtitle && <p style={{ color: 'rgba(255,255,255,0.85)', margin: '0 0 12px' }}>{d.subtitle}</p>}
        {d.ctaLabel && <span style={{ display: 'inline-block', background: 'white', color: '#18181b', padding: '8px 16px', borderRadius: 999, fontWeight: 600, fontSize: 13 }}>{d.ctaLabel}</span>}
      </div>
    </div>
  );
  if (block.type === 'parallax-slider') return (
    <div style={{ background: d.slides?.[0]?.image ? `url(${d.slides[0].image}) center/cover` : '#1f1f23', padding: 32, borderRadius: 12, marginBottom: 12, textAlign: 'center', minHeight: 160 }}>
      <h2 style={{ color: 'white', fontSize: 22, margin: 0 }}>{d.slides?.[0]?.title || 'Slider'}</h2>
      <p style={{ opacity: 0.5, fontSize: 11, marginTop: 8 }}>{d.slides?.length || 0} slides</p>
    </div>
  );
  if (block.type === 'spacer') return <div style={{ height: d.height || 60 }} />;
  return null;
}

/* ─── Drawer édition ────────────────────────── */
function BlockEditDrawer({ block, orgSlug, onChange, onChangeData, onClose }: {
  block: Block; orgSlug: string;
  onChange: (p: Partial<Block>) => void;
  onChangeData: (p: any) => void;
  onClose: () => void;
}) {
  return (
    <aside style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#0a0a0f', borderLeft: '1px solid #27272a', overflow: 'auto', zIndex: 30, animation: 'slideIn 0.2s ease-out' }}>
      <header style={{ position: 'sticky', top: 0, background: '#18181b', borderBottom: '1px solid #27272a', padding: 12, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>Bloc {block.type}</h3>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: '#a1a1aa', fontSize: 18, cursor: 'pointer' }}>✕</button>
      </header>

      <div style={{ padding: 14 }}>
        {/* Width + Effect */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label>
            <span style={{ display: 'block', fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Largeur</span>
            <select value={block.width} onChange={(e) => onChange({ width: e.target.value })} style={inputStyle}>
              {WIDTH_OPTIONS.map((w) => <option key={w.v} value={w.v}>{w.l}</option>)}
            </select>
          </label>
          <label>
            <span style={{ display: 'block', fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 }}>Délai (ms)</span>
            <input type="number" value={block.effectDelay || 0} onChange={(e) => onChange({ effectDelay: Number(e.target.value) })} style={inputStyle} />
          </label>
        </div>

        <EffectPicker value={block.effect} onChange={(v) => onChange({ effect: v })} />

        {/* Block-specific edits */}
        {block.type === 'text' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>HTML</label>
            <textarea value={block.data?.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={10} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
          </div>
        )}

        {block.type === 'image' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>URL image</label>
            <ImageUrlInput value={block.data?.src || ''} onChange={(v) => onChangeData({ src: v })} orgSlug={orgSlug} />
            {block.data?.src && <img src={block.data.src} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginTop: 6 }} />}
            <label style={labelStyle}>Alt text</label>
            <input value={block.data?.alt || ''} onChange={(e) => onChangeData({ alt: e.target.value })} style={inputStyle} />
          </div>
        )}

        {block.type === 'video' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>URL vidéo (mp4 ou YouTube)</label>
            <input value={block.data?.src || ''} onChange={(e) => onChangeData({ src: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} placeholder="https://youtube.com/embed/..." />
          </div>
        )}

        {block.type === 'cta' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Label</label>
            <input value={block.data?.label || ''} onChange={(e) => onChangeData({ label: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Lien</label>
            <input value={block.data?.href || ''} onChange={(e) => onChangeData({ href: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
          </div>
        )}

        {(block.type === 'hero' || block.type === 'parallax-hero') && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Titre</label>
            <input value={block.data?.title || ''} onChange={(e) => onChangeData({ title: e.target.value })} style={inputStyle} />
            <label style={labelStyle}>Sous-titre</label>
            <input value={block.data?.subtitle || ''} onChange={(e) => onChangeData({ subtitle: e.target.value })} style={inputStyle} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={labelStyle}>CTA label</label>
                <input value={block.data?.ctaLabel || ''} onChange={(e) => onChangeData({ ctaLabel: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CTA href</label>
                <input value={block.data?.ctaHref || ''} onChange={(e) => onChangeData({ ctaHref: e.target.value })} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
              </div>
            </div>
            {block.type === 'parallax-hero' && (
              <>
                <label style={labelStyle}>🏔 Layer fond (image)</label>
                <ImageUrlInput value={block.data?.bgImage || ''} onChange={(v) => onChangeData({ bgImage: v })} orgSlug={orgSlug} layer="parallax-bg" />
                <label style={labelStyle}>⛰ Layer milieu (PNG transparent)</label>
                <ImageUrlInput value={block.data?.midImage || ''} onChange={(v) => onChangeData({ midImage: v })} orgSlug={orgSlug} layer="parallax-mid" />
                <label style={labelStyle}>🌳 Layer foreground (PNG transparent)</label>
                <ImageUrlInput value={block.data?.fgImage || ''} onChange={(v) => onChangeData({ fgImage: v })} orgSlug={orgSlug} layer="parallax-fg" />
                <label style={labelStyle}>Texte flottant (déco)</label>
                <input value={block.data?.floatingText || ''} onChange={(e) => onChangeData({ floatingText: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>Hauteur</label>
                <input value={block.data?.height || '90vh'} onChange={(e) => onChangeData({ height: e.target.value })} style={inputStyle} />
              </>
            )}
          </div>
        )}

        {block.type === 'spacer' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>Hauteur (px)</label>
            <input type="number" value={block.data?.height || 60} onChange={(e) => onChangeData({ height: Number(e.target.value) })} style={inputStyle} />
          </div>
        )}

        {block.type === 'embed' && (
          <div style={{ marginTop: 12 }}>
            <label style={labelStyle}>HTML / iframe</label>
            <textarea value={block.data?.html || ''} onChange={(e) => onChangeData({ html: e.target.value })} rows={8} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: '@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }' }} />
    </aside>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: 8, background: '#18181b', border: '1px solid #27272a', borderRadius: 6, color: 'inherit', fontSize: 13,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginTop: 10, marginBottom: 4, letterSpacing: 1,
};

/* ─── Effect picker (popover compact des 100 effets) ─────────────── */
function EffectPicker({ value, onChange }: { value?: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EffectCategory>('entry');
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = value ? EFFECTS.find((e) => e.id === value) : null;
  const filtered = search
    ? EFFECTS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search.toLowerCase()))
    : EFFECTS.filter((e) => e.category === tab);

  // Ferme au ESC et au clic en dehors
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [open]);

  function intensityBadge(intensity?: string) {
    if (!intensity) return null;
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      subtle: { bg: '#3b82f622', fg: '#60a5fa', label: 'subtle' },
      medium: { bg: '#a78bfa22', fg: '#a78bfa', label: 'medium' },
      wow:    { bg: '#d946ef33', fg: '#e879f9', label: 'WOW' },
    };
    const m = map[intensity] || map.medium;
    return (
      <span style={{ fontSize: 9, padding: '1px 4px', background: m.bg, color: m.fg, borderRadius: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</span>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block' }}>
        <span style={labelStyle}>Effet ✨ (parmi 100)</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Sélectionner un effet visuel"
          style={{ ...inputStyle, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {selected ? (
            <>
              <span>{selected.emoji}</span>
              <span>{selected.name}</span>
              {intensityBadge(selected.intensity)}
              <span style={{ marginLeft: 'auto', opacity: 0.5 }}>▾</span>
            </>
          ) : (
            <>
              <span style={{ opacity: 0.5 }}>Aucun</span>
              <span style={{ marginLeft: 'auto', opacity: 0.5 }}>▾</span>
            </>
          )}
        </button>
      </label>
      {open && (
        <div
          role="listbox"
          aria-label="Effets visuels"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 40,
            background: '#0a0a0f', border: '1px solid #d946ef55',
            borderRadius: 12, boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,70,239,0.15)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            maxHeight: 460,
            animation: 'pxs-fx-pop .15s ease-out',
          }}
        >
          <header style={{ padding: 8, borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: 12, color: '#fafafa' }}>✨ Effets</strong>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un effet"
              style={{ ...inputStyle, marginLeft: 'auto', width: 140, padding: 6, fontSize: 11 }}
            />
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              aria-label="Désélectionner l'effet"
              style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '4px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 6 }}
            >Aucun</button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le sélecteur"
              style={{ background: 'transparent', border: 0, color: '#a1a1aa', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}
            >✕</button>
          </header>
          {!search && (
            <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 6, borderBottom: '1px solid #27272a' }}>
              {EFFECT_CATEGORIES.map((c) => {
                const count = EFFECTS.filter((e) => e.category === c.id).length;
                if (!count) return null;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setTab(c.id)}
                    aria-pressed={tab === c.id}
                    style={{
                      background: tab === c.id ? '#d946ef' : '#18181b',
                      color: tab === c.id ? 'white' : '#a1a1aa',
                      border: 0, padding: '4px 8px', borderRadius: 6, fontSize: 10, cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {c.emoji} {c.label} ({count})
                  </button>
                );
              })}
            </nav>
          )}
          <div
            style={{
              flex: 1, overflow: 'auto', padding: 6,
              display: 'grid',
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: 4,
            }}
          >
            {filtered.map((fx) => {
              const isActive = value === fx.id;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  key={fx.id}
                  onClick={() => { onChange(fx.id); setOpen(false); }}
                  title={`${fx.name} — ${fx.desc || ''}${fx.intensity ? ' (' + fx.intensity + ')' : ''}`}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #d946ef33, #06b6d433)' : '#18181b',
                    border: isActive ? '1px solid #d946ef' : '1px solid #27272a',
                    borderRadius: 6, padding: '6px 4px', cursor: 'pointer', textAlign: 'center',
                    color: 'inherit', position: 'relative', minHeight: 60,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    transition: 'transform .12s, border-color .12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = '#d946ef88'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = isActive ? '#d946ef' : '#27272a'; }}
                >
                  <span style={{ fontSize: 16 }}>{fx.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 600, lineHeight: 1.1 }}>{fx.name}</span>
                  {fx.intensity === 'wow' && (
                    <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 7, padding: '0 3px', background: '#d946ef', color: 'white', borderRadius: 2, fontWeight: 700 }}>W</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 16, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
                Aucun effet trouvé
              </div>
            )}
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `@keyframes pxs-fx-pop { from { opacity: 0; transform: translateY(-4px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }` }} />
    </div>
  );
}

/* ─── Image URL Input avec bouton IA ────────────────────────── */
function ImageUrlInput({ value, onChange, orgSlug, layer }: { value: string; onChange: (v: string) => void; orgSlug: string; layer?: 'parallax-bg' | 'parallax-mid' | 'parallax-fg' }) {
  const [generating, setGenerating] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [prompt, setPrompt] = useState('');

  async function generate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), layer: layer || 'image', aspectRatio: '16:9' }),
      });
      const j = await r.json();
      if (j.ok && j.images?.[0]) {
        onChange(j.images[0]);
        setShowAi(false);
        setPrompt('');
      } else {
        alert('Erreur: ' + (j.error || 'unknown'));
      }
    } catch (e: any) {
      alert(e.message);
    }
    setGenerating(false);
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 4 }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL image" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 11 }} />
        <button type="button" onClick={() => setShowAi(true)} title="Générer avec IA" style={{ background: 'linear-gradient(135deg, #fbbf24, #d946ef)', color: 'white', border: 0, padding: '0 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>✨ IA</button>
      </div>
      {showAi && (
        <div onClick={() => setShowAi(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#0a0a0f', border: '1px solid #d946ef40', borderRadius: 12, width: '100%', maxWidth: 480, padding: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>✨ Générer une image IA</h3>
            {layer && (layer === 'parallax-mid' || layer === 'parallax-fg') && <p style={{ fontSize: 11, color: '#fbbf24', margin: '0 0 8px' }}>💡 PNG transparent — décris juste l'élément, le fond sera transparent.</p>}
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} placeholder="Décris l'image…" style={{ ...inputStyle, marginBottom: 8 }} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAi(false)} style={{ background: 'transparent', border: 0, color: '#a1a1aa', padding: '8px 12px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={generate} disabled={generating || !prompt.trim()} style={{ background: 'linear-gradient(135deg, #fbbf24, #d946ef)', color: 'white', border: 0, padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer', opacity: generating ? 0.5 : 1 }}>
                {generating ? 'Génération…' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
