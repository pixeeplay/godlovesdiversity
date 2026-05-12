'use client';
/**
 * MediaLibrary — panneau latéral drag&drop multi-source.
 *
 * 7 onglets :
 *   🖼 Photos (Unsplash + Pexels + Pixabay agrégés)
 *   🎬 Vidéos (Pexels videos + Pixabay videos)
 *   🎞 GIFs (Giphy)
 *   ▶️ YouTube (Data API)
 *   ✨ IA (Flux / Unsplash fallback)
 *   📁 Mes médias (Asset table tenant)
 *   ⬆️ Uploader (multipart → MinIO/S3 ou local)
 *
 * Le drag&drop utilise HTML5 native : on set `dataTransfer.setData('text/plain', url)`.
 * Les blocs visuels du builder peuvent écouter `onDragOver` + `onDrop` pour set data.src.
 *
 * Le composant ouvre côté droit en overlay slide-in.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { colors, gradients } from '@/lib/design-tokens';

export interface MediaResult {
  id: string;
  type: 'photo' | 'video' | 'gif' | 'youtube';
  url: string;
  thumb: string;
  alt?: string;
  width?: number;
  height?: number;
  author?: string;
  authorUrl?: string;
  sourceUrl?: string;
  source: 'unsplash' | 'pexels' | 'pixabay' | 'giphy' | 'youtube' | 'ai' | 'local';
}

export type MediaSource =
  | 'all-photos' | 'all-videos' | 'giphy' | 'youtube' | 'ai' | 'mine' | 'upload';

const TABS: { id: MediaSource; emoji: string; label: string; hint: string }[] = [
  { id: 'all-photos', emoji: '🖼', label: 'Photos', hint: 'Unsplash · Pexels · Pixabay' },
  { id: 'all-videos', emoji: '🎬', label: 'Vidéos', hint: 'Pexels · Pixabay' },
  { id: 'giphy',      emoji: '🎞', label: 'GIFs', hint: 'Giphy' },
  { id: 'youtube',    emoji: '▶️', label: 'YouTube', hint: 'Search vidéos' },
  { id: 'ai',         emoji: '✨', label: 'Générer IA', hint: 'Flux / Unsplash' },
  { id: 'mine',       emoji: '📁', label: 'Mes médias', hint: 'Sauvegardés' },
  { id: 'upload',     emoji: '⬆️', label: 'Uploader', hint: 'Local → cloud' },
];

const USE_AS: { v: string; label: string; emoji: string }[] = [
  { v: 'image',           label: 'Image simple',     emoji: '🖼' },
  { v: 'parallax-hero',   label: 'Hero parallax',    emoji: '⛰' },
  { v: 'parallax-slider', label: 'Slide #1',         emoji: '🎞' },
  { v: 'gallery',         label: 'Galerie (append)', emoji: '🖼' },
  { v: 'cta-banner',      label: 'CTA banner',       emoji: '📢' },
];

interface Props {
  orgSlug: string;
  /** Suggestions de mots-clés (thème site, brief). */
  suggestions?: string[];
  /** Callback pour insérer dans le bloc courant. */
  onInsert?: (media: MediaResult, useAs?: string) => void;
  /** Fermeture. */
  onClose: () => void;
  /** Open ou fermé. */
  open: boolean;
}

export function MediaLibrary({ orgSlug, suggestions = [], onInsert, onClose, open }: Props) {
  const [tab, setTab] = useState<MediaSource>('all-photos');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const [mineList, setMineList] = useState<any[]>([]);
  const [uploadingPct, setUploadingPct] = useState<number | null>(null);
  const [useAsOpen, setUseAsOpen] = useState<MediaResult | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Escape pour fermer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    setTimeout(() => searchRef.current?.focus(), 100);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-load "mine" tab quand on switch
  useEffect(() => {
    if (!open) return;
    if (tab === 'mine') loadMine();
    if (tab === 'upload') setResults([]);
  }, [tab, open]);

  async function search(currentQuery = query, currentTab: MediaSource = tab) {
    if (currentTab === 'mine') return loadMine(currentQuery);
    if (currentTab === 'upload') return;
    if (!currentQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true); setErrors([]);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/media/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentQuery.trim(), source: currentTab, perPage: 24 }),
      });
      const j = await r.json();
      setResults(j.results || []);
      setErrors(j.errors || []);
    } catch (e: any) {
      setErrors(['fetch:' + (e?.message || 'err')]);
    }
    setLoading(false);
  }

  async function loadMine(q = '') {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/media/save${q ? `?q=${encodeURIComponent(q)}` : ''}`);
      const j = await r.json();
      setMineList(j.assets || []);
      // Convert to MediaResult format
      const converted: MediaResult[] = (j.assets || []).map((a: any) => ({
        id: a.id,
        type: (a.mimeType?.startsWith('video') ? 'video'
          : a.mimeType === 'image/gif' ? 'gif'
          : a.mimeType === 'video/youtube' ? 'youtube' : 'photo') as MediaResult['type'],
        url: a.url || '',
        thumb: a.url || '',
        alt: a.alt || a.filename,
        width: a.width || undefined, height: a.height || undefined,
        author: a.tags?.find((t: string) => t.startsWith('by:'))?.slice(3),
        source: 'local',
      }));
      setResults(converted);
    } catch {
      setMineList([]); setResults([]);
    }
    setLoading(false);
  }

  async function saveMedia(m: MediaResult) {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/media/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: m.url, type: m.type, alt: m.alt, source: m.source,
          author: m.author, sourceUrl: m.sourceUrl,
          width: m.width, height: m.height,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        // Petit feedback visuel
        setHover(`saved-${m.id}`);
        setTimeout(() => setHover(null), 1200);
      }
    } catch {}
  }

  async function uploadLocal(files: FileList | null) {
    if (!files || !files.length) return;
    for (const file of Array.from(files)) {
      setUploadingPct(0);
      const form = new FormData();
      form.append('file', file);
      try {
        const r = await fetch(`/api/orgs/${orgSlug}/media/upload`, { method: 'POST', body: form });
        const j = await r.json();
        if (j.url) {
          // Push immédiatement dans les résultats
          const m: MediaResult = {
            id: j.asset?.id || `local-${Date.now()}`,
            type: file.type.startsWith('video') ? 'video' : file.type === 'image/gif' ? 'gif' : 'photo',
            url: j.url, thumb: j.url, alt: file.name,
            source: 'local',
          };
          setResults((prev) => [m, ...prev]);
        }
      } catch {}
      setUploadingPct(null);
    }
  }

  function onDragStart(e: React.DragEvent, m: MediaResult) {
    e.dataTransfer.setData('text/plain', m.url);
    e.dataTransfer.setData('application/x-pxs-media', JSON.stringify(m));
    e.dataTransfer.effectAllowed = 'copy';
  }

  if (!open) return null;

  return (
    <>
      <div
        role="dialog" aria-modal="true" aria-label="Bibliothèque média"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 70,
          backdropFilter: 'blur(4px)',
          animation: 'pxsFadeIn .15s ease-out',
        }}
      >
        <aside
          style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(680px, 95vw)',
            background: colors.bg, color: colors.text,
            borderLeft: `1px solid ${colors.border}`,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.7)',
            animation: 'pxsSlideIn .2s ease-out',
          }}
        >
          {/* Header */}
          <header style={{
            padding: 14, borderBottom: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
            background: gradients.brand,
          }}>
            <span style={{ fontSize: 22 }}>🖼</span>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Bibliothèque média</strong>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Drag&drop · 6+ sources · ESC pour fermer
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer"
              style={{
                background: 'rgba(255,255,255,0.15)', border: 0, color: 'white',
                width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16,
              }}>✕</button>
          </header>

          {/* Tabs */}
          <nav style={{
            display: 'flex', gap: 4, overflowX: 'auto', padding: '8px 10px',
            borderBottom: `1px solid ${colors.border}`, background: colors.bgCard,
          }}>
            {TABS.map((t) => (
              <button key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                title={t.hint}
                style={{
                  background: tab === t.id ? gradients.brand : 'transparent',
                  border: `1px solid ${tab === t.id ? 'transparent' : colors.border}`,
                  color: tab === t.id ? 'white' : colors.text,
                  padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                  transition: 'all .15s',
                }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </nav>

          {/* Search + suggestions */}
          {tab !== 'upload' && (
            <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()}
                  placeholder={tab === 'mine' ? 'Filtrer mes médias…' : tab === 'ai' ? 'Décris l\'image à générer…' : `Rechercher dans ${TABS.find((t) => t.id === tab)?.label}…`}
                  aria-label="Recherche média"
                  style={{
                    flex: 1, padding: 10, background: colors.bgCard,
                    border: `1px solid ${colors.borderLight}`, borderRadius: 8,
                    color: colors.text, fontSize: 13, outline: 'none',
                  }}
                />
                <button onClick={() => search()}
                  style={{
                    background: gradients.brand, color: 'white', border: 0,
                    padding: '0 16px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                  }}>
                  {tab === 'ai' ? '✨ Générer' : '🔎'}
                </button>
              </div>
              {suggestions.length > 0 && !query && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, opacity: 0.5, alignSelf: 'center', textTransform: 'uppercase', letterSpacing: 1 }}>Suggestions :</span>
                  {suggestions.slice(0, 6).map((s) => (
                    <button key={s}
                      onClick={() => { setQuery(s); search(s); }}
                      style={{
                        background: colors.bgCard, border: `1px solid ${colors.border}`,
                        color: colors.textMuted, padding: '3px 9px', borderRadius: 999,
                        cursor: 'pointer', fontSize: 11,
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload zone */}
          {tab === 'upload' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              <UploadDropzone
                onFiles={uploadLocal}
                uploadingPct={uploadingPct}
              />
              {results.length > 0 && (
                <>
                  <h4 style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginTop: 16 }}>Uploadés cette session</h4>
                  <Grid
                    results={results}
                    onInsert={onInsert}
                    onSave={saveMedia}
                    onUseAs={(m) => setUseAsOpen(m)}
                    onDragStart={onDragStart}
                    hover={hover} setHover={setHover}
                  />
                </>
              )}
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div style={{ padding: '8px 12px', background: '#f59e0b15', color: colors.warning, fontSize: 11, borderBottom: `1px solid ${colors.border}` }}>
              ⚠ Sources manquantes : {errors.filter((e) => e.includes('no-key')).map((e) => e.split(':')[0]).join(', ') || errors.slice(0, 2).join(', ')}
              {' '}<a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ color: colors.primary, textDecoration: 'underline' }}>Configurer les clés</a>
            </div>
          )}

          {/* Results grid */}
          {tab !== 'upload' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} style={{
                      aspectRatio: '1', background: colors.bgCard, borderRadius: 8,
                      animation: 'pxsShimmer 1.4s infinite',
                    }} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <EmptyState tab={tab} hasQuery={!!query} />
              ) : (
                <Grid
                  results={results}
                  onInsert={onInsert}
                  onSave={saveMedia}
                  onUseAs={(m) => setUseAsOpen(m)}
                  onDragStart={onDragStart}
                  hover={hover} setHover={setHover}
                />
              )}
              <p style={{ fontSize: 10, opacity: 0.4, textAlign: 'center', marginTop: 16 }}>
                Astuce : <strong>glisse</strong> directement un média sur un bloc du builder.
              </p>
            </div>
          )}

          {/* "Utiliser comme..." dropdown */}
          {useAsOpen && (
            <UseAsModal
              media={useAsOpen}
              onClose={() => setUseAsOpen(null)}
              onPick={(useAs) => {
                onInsert?.(useAsOpen, useAs);
                setUseAsOpen(null);
              }}
            />
          )}
        </aside>
      </div>

      <style>{`
        @keyframes pxsSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes pxsFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pxsShimmer {
          0% { opacity: .4; } 50% { opacity: .8; } 100% { opacity: .4; }
        }
        .pxs-media-card:focus-visible {
          outline: 2px solid ${colors.primary} !important;
          outline-offset: 2px !important;
        }
      `}</style>
    </>
  );
}

/* ──────────────── Sub-components ──────────────── */

function Grid({ results, onInsert, onSave, onUseAs, onDragStart, hover, setHover }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
      {results.map((m: MediaResult) => (
        <article
          key={m.id}
          className="pxs-media-card"
          draggable
          tabIndex={0}
          onDragStart={(e) => onDragStart(e, m)}
          onMouseEnter={() => setHover(m.id)}
          onMouseLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onInsert?.(m);
          }}
          aria-label={`${m.source} ${m.type} : ${m.alt || ''}`}
          style={{
            position: 'relative', aspectRatio: '1',
            background: colors.bgCard, border: `1px solid ${colors.border}`,
            borderRadius: 10, overflow: 'hidden', cursor: 'grab',
            transition: 'transform .15s, box-shadow .15s, border-color .15s',
            borderColor: hover === m.id ? colors.primary : colors.border,
            transform: hover === m.id ? 'scale(1.02)' : 'scale(1)',
            boxShadow: hover === m.id ? '0 6px 18px rgba(217,70,239,0.3)' : 'none',
          }}
        >
          <img
            src={m.thumb}
            alt={m.alt || ''}
            loading="lazy"
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />

          {/* Type badge */}
          <span style={{
            position: 'absolute', top: 4, left: 4,
            background: 'rgba(0,0,0,0.65)', color: 'white',
            fontSize: 9, padding: '2px 6px', borderRadius: 999,
            textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1,
          }}>{m.type === 'youtube' ? '▶' : m.type === 'video' ? '🎬' : m.type === 'gif' ? 'GIF' : m.source}</span>

          {/* Author credit */}
          {m.author && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              color: 'white', padding: '12px 6px 4px',
              fontSize: 9, opacity: 0.85,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{m.author}</div>
          )}

          {/* Hover actions */}
          {hover === m.id && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 4, flexDirection: 'column', padding: 6,
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onInsert?.(m); }}
                title="Insérer dans le bloc actuel"
                style={{
                  background: gradients.brand, color: 'white', border: 0,
                  padding: '6px 12px', borderRadius: 6, fontSize: 11,
                  fontWeight: 700, cursor: 'pointer', width: '100%',
                }}>Insérer</button>
              <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onUseAs?.(m); }}
                  title="Utiliser comme hero / slider / etc."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.15)', color: 'white',
                    border: 0, padding: '4px', borderRadius: 4, fontSize: 10,
                    cursor: 'pointer', fontWeight: 600,
                  }}>Comme…</button>
                <button
                  onClick={(e) => { e.stopPropagation(); onSave?.(m); }}
                  title="Sauver dans mes médias"
                  style={{
                    background: 'rgba(255,255,255,0.15)', color: 'white',
                    border: 0, padding: '4px 8px', borderRadius: 4, fontSize: 11,
                    cursor: 'pointer', fontWeight: 600,
                  }}>♥</button>
              </div>
            </div>
          )}
          {hover === `saved-${m.id}` && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(16,185,129,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11, fontWeight: 800,
            }}>✓ Sauvé</div>
          )}
        </article>
      ))}
    </div>
  );
}

function EmptyState({ tab, hasQuery }: { tab: MediaSource; hasQuery: boolean }) {
  if (!hasQuery && tab !== 'mine') {
    return (
      <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔎</div>
        <p style={{ fontSize: 13 }}>Tape ta recherche puis appuie sur Entrée.</p>
        <p style={{ fontSize: 11, opacity: 0.7 }}>{TABS.find((t) => t.id === tab)?.hint}</p>
      </div>
    );
  }
  return (
    <div style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
      <p style={{ fontSize: 13 }}>Aucun résultat — essaie d'autres mots-clés.</p>
    </div>
  );
}

function UseAsModal({ media, onClose, onPick }: { media: MediaResult; onClose: () => void; onPick: (v: string) => void }) {
  return (
    <div onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, zIndex: 5,
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.bgCard, border: `1px solid ${colors.borderLight}`,
          borderRadius: 12, padding: 16, width: '100%', maxWidth: 380,
        }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Utiliser comme…</h3>
        <div style={{ display: 'grid', gap: 6 }}>
          {USE_AS.map((u) => (
            <button key={u.v} onClick={() => onPick(u.v)}
              style={{
                background: colors.bg, border: `1px solid ${colors.border}`,
                color: colors.text, padding: '10px 12px', borderRadius: 8,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                gap: 10, textAlign: 'left', fontSize: 13,
              }}>
              <span style={{ fontSize: 18 }}>{u.emoji}</span>
              <span style={{ flex: 1 }}>{u.label}</span>
              <span style={{ opacity: 0.4 }}>→</span>
            </button>
          ))}
        </div>
        <button onClick={onClose}
          style={{
            marginTop: 12, width: '100%', background: 'transparent',
            border: `1px solid ${colors.border}`, color: colors.textMuted,
            padding: 8, borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}>Annuler</button>
      </div>
    </div>
  );
}

function UploadDropzone({ onFiles, uploadingPct }: { onFiles: (f: FileList | null) => void; uploadingPct: number | null }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${drag ? colors.primary : colors.borderLight}`,
        background: drag ? `${colors.primary}11` : colors.bgCard,
        padding: 40, borderRadius: 14, textAlign: 'center', cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <input ref={inputRef} type="file" multiple accept="image/*,video/*"
        onChange={(e) => onFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      <div style={{ fontSize: 56, marginBottom: 12 }}>⬆️</div>
      <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Glisse tes fichiers ici</h3>
      <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
        ou clique pour parcourir · jpg/png/webp/mp4/gif
      </p>
      {uploadingPct != null && (
        <div style={{ marginTop: 16, padding: 12, background: colors.bg, borderRadius: 8 }}>
          <div style={{ fontSize: 11, marginBottom: 6 }}>Upload en cours… {uploadingPct}%</div>
          <div style={{ height: 4, background: colors.border, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${uploadingPct}%`, background: gradients.brand, transition: 'width .2s' }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Toolbar button utility ──────────────── */

/** Bouton à intégrer dans la toolbar du Page Builder pour ouvrir la lib. */
export function MediaLibraryToolbarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Bibliothèque média (Unsplash, Pexels, Pixabay, Giphy, YouTube, IA, uploads)"
      style={{
        background: gradients.brand, color: 'white', border: 0,
        padding: '6px 12px', borderRadius: 6, fontSize: 12,
        cursor: 'pointer', fontWeight: 700, display: 'flex',
        alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
      }}>
      🖼 Médias
    </button>
  );
}
