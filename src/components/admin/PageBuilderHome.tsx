'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout, ChevronRight, Loader2, Search, RefreshCw, FileCode, Edit3, AlertCircle, Download, CheckCircle2, X as XIcon, AlertTriangle, Sparkles, Plus, Image as ImageIcon, Video } from 'lucide-react';

interface PageInfo {
  slug: string;
  label: string;
  desc: string;
  emoji: string;
  blockCount: number;
  hasCode: boolean;
  status: 'edited' | 'codeOnly' | 'orphan';
}

const STATUS_META: Record<string, { color: string; label: string; icon: any }> = {
  edited:   { color: 'fuchsia', label: 'Édité dans builder',   icon: Edit3 },
  codeOnly: { color: 'cyan',    label: 'Code only',           icon: FileCode },
  orphan:   { color: 'amber',   label: 'Orphelin DB',         icon: AlertCircle }
};

export function PageBuilderHome() {
  const router = useRouter();
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'edited' | 'codeOnly' | 'orphan'>('all');
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/page-builder/discover', { cache: 'no-store' });
    const j = await r.json();
    setPages(j.pages || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function importAll(onlyCodeOnly: boolean, intensity: 'none' | 'subtle' | 'medium' | 'wow' = 'subtle') {
    const message = onlyCodeOnly
      ? `Importer le contenu actuel de TOUTES les pages "Code only" (${counts.codeOnly} pages) avec effets ${intensity} ?`
      : `⚠️ DANGER : Importer le contenu de TOUTES les pages (${pages.length}), y compris celles déjà éditées (${counts.edited}). Les blocs existants seront REMPLACÉS.\n\nContinuer ?`;
    if (!confirm(message)) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await fetch('/api/admin/page-builder/import-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlyCodeOnly,
          mode: 'replace',
          locale: 'fr',
          concurrency: 3,
          effectIntensity: intensity
        })
      });
      const j = await r.json();
      setImportResult(j);
      if (j.ok) load();
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
    setImporting(false);
  }

  const filtered = pages.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.label.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: pages.length,
    edited: pages.filter((p) => p.status === 'edited').length,
    codeOnly: pages.filter((p) => p.status === 'codeOnly').length,
    orphan: pages.filter((p) => p.status === 'orphan').length
  };

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-600 rounded-2xl p-5 mb-4 ring-1 ring-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.2),transparent)]" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">🎨</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-black text-white tracking-tight">Page Builder</h1>
            <p className="text-white/85 text-sm mt-0.5">
              Édite visuellement les pages du site — preview live + import contenu existant
            </p>
          </div>
          <button
            onClick={() => setShowAiModal(true)}
            className="bg-gradient-to-r from-amber-400 to-fuchsia-500 hover:opacity-90 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5 shadow-xl ring-2 ring-white/30"
            title="Génère une page complète avec Gemini IA"
          >
            <Sparkles size={11} /> Générer avec IA
          </button>
          <BulkImportDropdown
            counts={counts}
            importing={importing}
            disabled={loading}
            onImport={importAll}
          />
          <button onClick={load} disabled={importing} className="bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-full flex items-center gap-1.5">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Scanner
          </button>
        </div>
      </div>

      {/* Result modal après import-all */}
      {importResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setImportResult(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-fuchsia-500/30 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <header className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold">Résultat de l'import</h3>
              <button onClick={() => setImportResult(null)} className="ml-auto text-zinc-400 hover:text-white"><XIcon size={14} /></button>
            </header>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{importResult.summary?.success || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-emerald-300">Succès</div>
                </div>
                <div className="bg-rose-500/10 ring-1 ring-rose-500/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-rose-400">{importResult.summary?.failed || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-rose-300">Échecs</div>
                </div>
                <div className="bg-fuchsia-500/10 ring-1 ring-fuchsia-500/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-fuchsia-400">{importResult.summary?.totalBlocks || 0}</div>
                  <div className="text-[10px] uppercase tracking-widest text-fuchsia-300">Blocs créés</div>
                </div>
              </div>
              {Array.isArray(importResult.results) && (
                <ul className="space-y-1 max-h-[40vh] overflow-y-auto bg-zinc-900 rounded-xl p-2">
                  {importResult.results.map((r: any) => (
                    <li key={r.slug} className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-zinc-800">
                      {r.ok ? <CheckCircle2 size={11} className="text-emerald-400" /> : <AlertTriangle size={11} className="text-rose-400" />}
                      <code className="text-zinc-300 flex-1">/{r.slug}</code>
                      {r.ok ? (
                        <span className="text-fuchsia-400 font-bold">{r.blocks} bloc{r.blocks > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-rose-400 text-[10px]">{r.error}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex justify-end gap-2">
              <button onClick={() => setImportResult(null)} className="text-xs text-zinc-400 hover:text-white px-3 py-1.5">Fermer</button>
              <button onClick={() => importAll(false)} disabled={importing} className="text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 px-3 py-1.5 rounded-full ring-1 ring-rose-500/40 flex items-center gap-1">
                <AlertTriangle size={10} /> Re-importer TOUT (incl. déjà édité)
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une page…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>Toutes</FilterPill>
          <FilterPill active={filter === 'edited'} onClick={() => setFilter('edited')} count={counts.edited} color="fuchsia">Éditées</FilterPill>
          <FilterPill active={filter === 'codeOnly'} onClick={() => setFilter('codeOnly')} count={counts.codeOnly} color="cyan">Code only</FilterPill>
          {counts.orphan > 0 && <FilterPill active={filter === 'orphan'} onClick={() => setFilter('orphan')} count={counts.orphan} color="amber">Orphelines</FilterPill>}
        </div>
      </div>

      {/* Helper banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-3 text-[11px] text-cyan-200/90 flex items-center gap-2 flex-wrap">
        <p className="flex-1">
          💡 <strong>Code only</strong> = page Next.js non encore éditée. <strong>Tout importer</strong> ↑ pour les convertir en blocs.
          Ou <strong>Générer avec IA</strong> ↑ pour créer une page complète depuis zéro avec Gemini.
        </p>
        <button
          onClick={async () => {
            if (!confirm('Créer la page de démo /demo-parallax-photo (12 blocs : parallax-hero + slider 4 photos + columns + vidéo + CTA) ?')) return;
            const r = await fetch('/api/admin/page-builder/seed-demo', { method: 'POST' });
            const j = await r.json();
            if (j.ok) {
              alert(`✓ ${j.blocksCount} blocs de démo créés ! Slug : /${j.slug}`);
              load();
            } else {
              alert('Erreur : ' + (j.error || 'unknown'));
            }
          }}
          className="bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 hover:text-fuchsia-200 text-[10px] font-bold px-3 py-1.5 rounded-full ring-1 ring-fuchsia-500/40 flex items-center gap-1"
        >
          <Sparkles size={10} /> Voir une démo
        </button>
      </div>

      {/* List */}
      {loading && pages.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-12 flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Scan des pages…
        </p>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
          <Layout size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-300">Aucune page ne correspond.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            return (
              <Link
                key={p.slug}
                href={`/admin/page-builder/${p.slug}`}
                className="group bg-zinc-900 hover:bg-zinc-800/50 ring-1 ring-zinc-800 hover:ring-fuchsia-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition relative"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center text-xl shrink-0 group-hover:from-fuchsia-500 group-hover:to-violet-500 transition">
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-sm text-white truncate">{p.label}</h3>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-${meta.color}-500/15 text-${meta.color}-300 flex items-center gap-1`}>
                      <Icon size={9} /> {meta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{p.desc}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <code className="text-zinc-600">/{p.slug}</code>
                    {p.blockCount > 0 && (
                      <span className="text-fuchsia-400">{p.blockCount} bloc{p.blockCount > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-fuchsia-300 transition flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}

      {/* AI generator modal */}
      {showAiModal && (
        <AiPageGenerator
          onClose={() => setShowAiModal(false)}
          onGenerated={(slug) => {
            setShowAiModal(false);
            router.push(`/admin/page-builder/${slug}`);
          }}
        />
      )}
    </div>
  );
}

function AiPageGenerator({ onClose, onGenerated }: { onClose: () => void; onGenerated: (slug: string) => void }) {
  const [slug, setSlug] = useState('');
  const [prompt, setPrompt] = useState('');
  const [theme, setTheme] = useState<'photo' | 'video' | 'spirituel' | 'custom'>('photo');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImage, setNewImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [wantParallaxHero, setWantParallaxHero] = useState(true);
  const [wantSlider, setWantSlider] = useState(true);
  const [wantVideo, setWantVideo] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const TEMPLATES = [
    {
      label: '📸 Page photographe mariage',
      slug: 'photographe-mariage',
      prompt: 'Page portfolio pour photographe de mariage à Paris, ton chic et émotionnel, mettre en avant le style chic-bohème, sections : portfolio + témoignages + tarifs + appel à devis. Sous-titre du hero "Capturer l\'amour, sublimer le souvenir".',
      theme: 'photo' as const,
      wantSlider: true,
      wantParallaxHero: true,
      wantVideo: false
    },
    {
      label: '🎥 Landing page court-métrage',
      slug: 'court-metrage-2026',
      prompt: 'Landing page pour un court-métrage LGBT inclusif. Inclure synopsis, casting, bande-annonce, équipe, festivals, soutenir le projet. Ton émouvant, militant.',
      theme: 'video' as const,
      wantSlider: true,
      wantParallaxHero: true,
      wantVideo: true
    },
    {
      label: '🙏 Page retraite spirituelle',
      slug: 'retraite-2026',
      prompt: 'Page pour une retraite spirituelle interreligieuse week-end LGBT-inclusive, programme, lieu, intervenants, prix, FAQ, inscription. Ton chaleureux et accueillant.',
      theme: 'spirituel' as const,
      wantSlider: true,
      wantParallaxHero: true,
      wantVideo: false
    }
  ];

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setSlug(t.slug);
    setPrompt(t.prompt);
    setTheme(t.theme);
    setWantSlider(t.wantSlider);
    setWantParallaxHero(t.wantParallaxHero);
    setWantVideo(t.wantVideo);
  }

  function addImage() {
    if (!newImage.trim()) return;
    setImageUrls((prev) => [...prev, newImage.trim()]);
    setNewImage('');
  }

  async function generate(dryRun: boolean) {
    if (!slug.trim()) { alert('Slug requis'); return; }
    if (!prompt.trim()) { alert('Prompt requis'); return; }
    setGenerating(true);
    setPreview(null);
    try {
      const r = await fetch('/api/admin/page-builder/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.trim().replace(/[^a-z0-9-]/gi, '-').toLowerCase(),
          prompt: prompt.trim(),
          theme,
          wantParallaxHero,
          wantSlider,
          wantVideo: wantVideo && !!videoUrl,
          imageUrls,
          videoUrl,
          mode: 'replace',
          dryRun
        })
      });
      const j = await r.json();
      if (j.ok) {
        if (dryRun) {
          setPreview(j);
        } else {
          alert(`✓ Page "${j.pageTitle}" générée avec ${j.blocksCount} blocs !`);
          onGenerated(j.slug);
        }
      } else {
        alert('Erreur Gemini : ' + (j.error || 'unknown') + (j.raw ? '\n\n' + j.raw.slice(0, 200) : ''));
      }
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    }
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border-b border-amber-500/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center text-xl">✨</div>
          <div>
            <h3 className="text-lg font-bold text-white">Générer une page avec IA</h3>
            <p className="text-[11px] text-zinc-300">Gemini 3 Flash crée la structure complète : hero parallax, slider, photos, texte, CTA</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white"><XIcon size={16} /></button>
        </header>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Templates */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-2">Templates rapides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {TEMPLATES.map((t, i) => (
                <button key={i} onClick={() => applyTemplate(t)} className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-amber-500/40 rounded-xl p-2.5 text-left text-xs transition">
                  <div className="font-bold text-white mb-0.5">{t.label}</div>
                  <div className="text-[10px] text-zinc-500 line-clamp-2">{t.prompt.slice(0, 80)}…</div>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs">
              <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Slug (URL)</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ma-nouvelle-page" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            </label>
            <label className="text-xs">
              <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Thème</span>
              <select value={theme} onChange={(e) => setTheme(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
                <option value="photo">📸 Photo / Portfolio</option>
                <option value="video">🎥 Vidéo / Cinéma</option>
                <option value="spirituel">🙏 Spirituel / Foi</option>
                <option value="custom">📄 Custom</option>
              </select>
            </label>
          </div>

          <label className="block text-xs">
            <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Prompt — décris la page que tu veux</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder='Ex: "Page portfolio pour photographe de mariage chic, mettre en avant style bohème, sections portfolio + tarifs + témoignages + appel à devis"'
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
          </label>

          {/* Blocks options */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Blocs spéciaux</p>
            <div className="flex flex-wrap gap-2">
              <ToggleChip active={wantParallaxHero} onChange={setWantParallaxHero}>⛰ Parallax Hero</ToggleChip>
              <ToggleChip active={wantSlider} onChange={setWantSlider}>🎞 Parallax Slider</ToggleChip>
              <ToggleChip active={wantVideo} onChange={setWantVideo}>🎬 Vidéo</ToggleChip>
            </div>
          </div>

          {/* Images */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 flex items-center gap-1">
              <ImageIcon size={11} /> Images à utiliser ({imageUrls.length})
            </p>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                placeholder="https://... URL d'une image"
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
              />
              <button onClick={addImage} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1">
                <Plus size={11} /> Ajouter
              </button>
            </div>
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {imageUrls.map((u, i) => (
                  <div key={i} className="relative group">
                    <img src={u} alt="" className="w-16 h-16 rounded-lg object-cover ring-1 ring-zinc-800" />
                    <button onClick={() => setImageUrls(imageUrls.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><XIcon size={10} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video */}
          {wantVideo && (
            <label className="block text-xs">
              <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1"><Video size={11} /> URL vidéo</span>
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/embed/... ou .mp4" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            </label>
          )}

          {/* Preview de dry-run */}
          {preview && (
            <div className="bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-xl p-3">
              <p className="text-xs font-bold text-emerald-300 mb-2">✓ Aperçu généré : <strong>{preview.pageTitle}</strong> ({preview.blocks?.length} blocs)</p>
              <ul className="text-[10px] text-zinc-300 space-y-0.5 max-h-32 overflow-y-auto">
                {(preview.blocks || []).map((b: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <code className="text-amber-400">{b.type}</code>
                    <span className="text-zinc-500">{b.width}</span>
                    {b.effect && <span className="text-fuchsia-400">{b.effect}</span>}
                    <span className="truncate">{b.data?.title || b.data?.label || (b.data?.html || '').replace(/<[^>]+>/g, ' ').slice(0, 60)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => generate(true)} disabled={generating} className="text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-2 rounded-full flex items-center gap-1">
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />} Aperçu (dry-run)
          </button>
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
          <button
            onClick={() => generate(false)}
            disabled={generating || !slug.trim() || !prompt.trim()}
            className="ml-auto bg-gradient-to-r from-amber-400 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generating ? 'Génération…' : 'Générer la page'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─── Bulk Import Dropdown ─────────────────────────────── */
function BulkImportDropdown({ counts, importing, disabled, onImport }: {
  counts: { all: number; edited: number; codeOnly: number; orphan: number };
  importing: boolean;
  disabled: boolean;
  onImport: (onlyCodeOnly: boolean, intensity: 'none' | 'subtle' | 'medium' | 'wow') => void;
}) {
  const [open, setOpen] = useState(false);

  const INTENSITIES: { v: 'none' | 'subtle' | 'medium' | 'wow'; label: string; emoji: string }[] = [
    { v: 'none',   label: 'Aucun',  emoji: '⚪' },
    { v: 'subtle', label: 'Sobre',  emoji: '🌱' },
    { v: 'medium', label: 'Moyen',  emoji: '✨' },
    { v: 'wow',    label: 'Wow',    emoji: '🎆' }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={importing || disabled}
        className="bg-white text-fuchsia-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5 shadow-xl"
      >
        {importing ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
        {importing ? 'Import…' : `Tout importer (${counts.codeOnly})`}
        <ChevronRight size={10} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && !importing && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-fuchsia-500/30 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <header className="bg-zinc-900 border-b border-zinc-800 p-3">
              <p className="text-xs font-bold text-white">Importer toutes les pages</p>
              <p className="text-[10px] text-zinc-500">Avec les effets que tu choisis</p>
            </header>
            <div className="p-3 space-y-3">
              {/* Intensity choice */}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5">Intensité des effets</label>
                <div className="grid grid-cols-4 gap-1">
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.v}
                      onClick={() => { setOpen(false); onImport(true, i.v); }}
                      className="bg-zinc-900 hover:bg-fuchsia-500/15 ring-1 ring-zinc-800 hover:ring-fuchsia-500/40 rounded-lg p-2 text-center transition"
                      title={`Importer ${counts.codeOnly} pages 'Code only' avec effets ${i.label}`}
                    >
                      <div className="text-lg">{i.emoji}</div>
                      <p className="text-[10px] font-bold text-white">{i.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Mode <strong>safe</strong> : seules les <strong>{counts.codeOnly} pages "Code only"</strong> sont touchées.
                </p>
              </div>

              {counts.edited > 0 && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-rose-300 font-bold mb-1.5">⚠ Mode danger</label>
                  <button
                    onClick={() => { setOpen(false); onImport(false, 'subtle'); }}
                    className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-xs font-bold px-3 py-2 rounded-lg ring-1 ring-rose-500/40 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={10} /> Réimporter TOUT ({counts.all}) avec effets sobre
                  </button>
                  <p className="text-[10px] text-rose-300/70 mt-1">
                    Écrase les <strong>{counts.edited}</strong> pages déjà éditées + les {counts.codeOnly} "Code only".
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ToggleChip({ active, onChange, children }: { active: boolean; onChange: (v: boolean) => void; children: any }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`text-xs px-3 py-1.5 rounded-full transition ${
        active
          ? 'bg-fuchsia-500 text-white ring-2 ring-fuchsia-300'
          : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function FilterPill({ active, onClick, count, children, color = 'zinc' }: {
  active: boolean; onClick: () => void; count: number; children: any; color?: string;
}) {
  const activeColors: Record<string, string> = {
    zinc: 'bg-fuchsia-500 text-white',
    fuchsia: 'bg-fuchsia-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    amber: 'bg-amber-500 text-white'
  };
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition flex items-center gap-1 ${
        active ? activeColors[color] : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {children} <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}
