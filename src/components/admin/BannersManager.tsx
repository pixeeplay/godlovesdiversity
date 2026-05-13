'use client';
import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, ArrowUp, ArrowDown, UploadCloud, Image as ImageIcon, Eye, EyeOff, Stethoscope } from 'lucide-react';

type Banner = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  cta1Text: string | null;
  cta1Url: string | null;
  cta2Text: string | null;
  cta2Url: string | null;
  accentColor: string | null;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export function BannersManager({ initial }: { initial: Banner[] }) {
  const [banners, setBanners] = useState(initial);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [diagBusy, setDiagBusy] = useState(false);

  async function checkStorage() {
    setDiagBusy(true);
    try {
      const r = await fetch('/api/admin/storage/check');
      const j = await r.json();
      // Affiche un dialog lisible
      let msg = `${r.ok ? '✅' : '❌'} Diagnostic MinIO\n\n`;
      msg += `Bucket : ${j.resolvedBucket}\n`;
      msg += `Endpoint : ${j.env?.S3_ENDPOINT}\n`;
      msg += `Access Key : ${j.env?.S3_ACCESS_KEY}\n\n`;
      msg += '─── Étapes ───\n';
      for (const step of j.steps || []) {
        msg += `${step.ok ? '✅' : '❌'} ${step.step}\n`;
        if (step.error) msg += `   Erreur : ${step.error}\n`;
        if (step.hint) msg += `   💡 ${step.hint}\n`;
        if (step.buckets) msg += `   Buckets : ${step.buckets.join(', ')}\n`;
      }
      if (j.summary) msg += `\n${j.summary}`;
      alert(msg);
    } catch (e: any) {
      alert(`Diagnostic échoué : ${e.message}`);
    } finally {
      setDiagBusy(false);
    }
  }

  async function move(b: Banner, dir: 1 | -1) {
    const sorted = [...banners].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((x) => x.id === b.id);
    const target = sorted[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch(`/api/admin/banners/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: target.order }) }),
      fetch(`/api/admin/banners/${target.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: b.order }) })
    ]);
    setBanners((arr) => arr.map((x) => {
      if (x.id === b.id) return { ...x, order: target.order };
      if (x.id === target.id) return { ...x, order: b.order };
      return x;
    }));
  }

  async function togglePub(b: Banner) {
    const r = await fetch(`/api/admin/banners/${b.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !b.published })
    });
    if (r.ok) setBanners((arr) => arr.map((x) => x.id === b.id ? { ...x, published: !b.published } : x));
  }

  async function del(b: Banner) {
    if (!confirm('Supprimer cette bannière ?')) return;
    const r = await fetch(`/api/admin/banners/${b.id}`, { method: 'DELETE' });
    if (r.ok) setBanners((arr) => arr.filter((x) => x.id !== b.id));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <a href="/" target="_blank" rel="noreferrer" className="btn-ghost text-xs"><Eye size={12} /> Voir le résultat sur la home</a>
        <div className="flex items-center gap-2">
          <button
            onClick={checkStorage}
            disabled={diagBusy}
            className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 disabled:opacity-50 flex items-center gap-1.5 font-bold transition"
            title="Diagnostic MinIO : vérifie credentials, bucket, upload/read"
          >
            {diagBusy ? <Loader2 size={12} className="animate-spin" /> : <Stethoscope size={12} />}
            {diagBusy ? 'Diag…' : 'Diagnostic MinIO'}
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary text-sm">
            <Plus size={14} /> Nouvelle bannière
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {banners.length === 0 && (
          <p className="text-zinc-500 italic text-center py-12 border border-dashed border-zinc-800 rounded-xl">
            Aucune bannière.
          </p>
        )}
        {banners.sort((a, b) => a.order - b.order).map((b, i) => (
          <article key={b.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
            <div className="w-32 h-20 rounded-lg shrink-0 bg-zinc-800 flex items-center justify-center overflow-hidden relative"
                 style={b.accentColor ? { borderLeft: `4px solid ${b.accentColor}` } : undefined}>
              {b.mediaUrl ? (
                b.mediaType === 'video'
                  ? <video src={b.mediaUrl} muted className="w-full h-full object-cover" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={b.mediaUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="text-zinc-600" />
              )}
              <div className="absolute top-1 left-1 text-[10px] bg-black/70 px-1.5 py-0.5 rounded font-bold">#{i + 1}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {b.eyebrow && <div className="text-[10px] uppercase tracking-widest text-brand-pink">{b.eyebrow}</div>}
                {/* Badge scope front */}
                {(b as any).siteScope === 'paris' && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300">🌸 Paris only</span>
                )}
                {(b as any).siteScope === 'france' && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">🏳️‍🌈 France only</span>
                )}
                {!(b as any).siteScope && (
                  <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">🌈 2 fronts</span>
                )}
              </div>
              <div className="font-bold">{b.title}</div>
              {b.subtitle && <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{b.subtitle}</p>}
              <div className="flex gap-1 mt-2">
                {b.cta1Text && <span className="text-[10px] px-2 py-0.5 rounded bg-brand-pink/15 text-brand-pink">{b.cta1Text}</span>}
                {b.cta2Text && <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">{b.cta2Text}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => move(b, -1)} disabled={i === 0} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => move(b, 1)} disabled={i === banners.length - 1} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => setEditing(b)} className="text-zinc-400 hover:text-white p-1"><Pencil size={14} /></button>
              <button onClick={() => togglePub(b)} className="text-zinc-400 hover:text-white p-1">
                {b.published ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button onClick={() => del(b)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>

      {(editing || creating) && (
        <BannerEditor
          banner={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={(b) => {
            setBanners((arr) => {
              const idx = arr.findIndex((x) => x.id === b.id);
              return idx === -1 ? [...arr, b] : arr.map((x) => x.id === b.id ? b : x);
            });
            setEditing(null); setCreating(false);
          }}
        />
      )}
    </>
  );
}

function BannerEditor({ banner, onClose, onSaved }: {
  banner: Banner | null; onClose: () => void; onSaved: (b: Banner) => void;
}) {
  const [eyebrow, setEyebrow] = useState(banner?.eyebrow || '');
  const [title, setTitle] = useState(banner?.title || '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle || '');
  const [mediaUrl, setMediaUrl] = useState(banner?.mediaUrl || '');
  const [mediaType, setMediaType] = useState(banner?.mediaType || '');
  const [cta1Text, setCta1Text] = useState(banner?.cta1Text || '');
  const [cta1Url, setCta1Url] = useState(banner?.cta1Url || '');
  const [cta2Text, setCta2Text] = useState(banner?.cta2Text || '');
  const [cta2Url, setCta2Url] = useState(banner?.cta2Url || '');
  const [accentColor, setAccentColor] = useState(banner?.accentColor || '#FF2BB1');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // IA + calendrier
  const [aiPrompt, setAiPrompt] = useState((banner as any)?.aiPrompt || '');
  const [presetSlug, setPresetSlug] = useState((banner as any)?.presetSlug || '');
  const [activeFrom, setActiveFrom] = useState((banner as any)?.activeFrom?.slice(0, 10) || '');
  const [activeUntil, setActiveUntil] = useState((banner as any)?.activeUntil?.slice(0, 10) || '');
  const [linkedThemeSlug, setLinkedThemeSlug] = useState((banner as any)?.linkedThemeSlug || '');
  const [siteScope, setSiteScope] = useState<'' | 'paris' | 'france'>((banner as any)?.siteScope || '');
  const [aiBusy, setAiBusy] = useState<'image' | 'video' | null>(null);
  const [aiPreview, setAiPreview] = useState<{ data: string; mimeType: string }[]>([]);
  const [hfModel, setHfModel] = useState<'higgsfield-lite' | 'higgsfield-standard' | 'higgsfield-turbo'>('higgsfield-lite');
  const [hfDuration, setHfDuration] = useState(5);
  const [hfMotion, setHfMotion] = useState<'low' | 'medium' | 'high'>('medium');
  const [hfLoop, setHfLoop] = useState(true);

  const PRESETS = [
    { slug: 'pride',        label: '🏳️‍🌈 Pride Month',  start: '06-01', end: '06-30' },
    { slug: 'noel',         label: '🎄 Noël',           start: '12-15', end: '12-26' },
    { slug: 'paques',       label: '🐰 Pâques',         start: '03-25', end: '04-10' },
    { slug: 'halloween',    label: '🎃 Halloween',      start: '10-25', end: '11-01' },
    { slug: 'valentin',     label: '💖 Saint Valentin', start: '02-10', end: '02-15' },
    { slug: 'ramadan',      label: '☪️ Ramadan',        start: '03-01', end: '04-01' },
    { slug: 'pessah',       label: '✡️ Pessah',         start: '04-01', end: '04-10' },
    { slug: 'diwali',       label: '🪔 Diwali',         start: '10-25', end: '11-05' },
    { slug: 'inclusivite',  label: '🌈 Inclusivité',    start: '',      end: '' },
    { slug: 'agenda',       label: '📅 Agenda/Event',   start: '',      end: '' }
  ];

  function applyPreset(slug: string) {
    const p = PRESETS.find(x => x.slug === slug);
    if (!p) return;
    setPresetSlug(slug);
    if (p.start && p.end) {
      const year = new Date().getFullYear();
      setActiveFrom(`${year}-${p.start}`);
      setActiveUntil(`${year}-${p.end}`);
    }
    if (!aiPrompt) setAiPrompt(`Bannière ${p.label} pour mouvement LGBT inclusif GLD`);
  }

  async function generateAI(kind: 'image' | 'video') {
    setAiBusy(kind);
    setAiPreview([]);
    try {
      const r = await fetch('/api/admin/banners/generate-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: presetSlug || undefined,
          prompt: aiPrompt || undefined,
          kind,
          count: 2,
          // Paramètres Higgsfield (utilisés uniquement si kind=video)
          higgsfield: kind === 'video' ? { model: hfModel, duration: hfDuration, motion: hfMotion, loop: hfLoop } : undefined
        })
      });
      const j = await r.json().catch(() => ({ error: `Réponse invalide (HTTP ${r.status})` }));
      if (!r.ok || !j.ok) {
        // Affiche l'erreur détaillée dans un alert lisible (multi-lignes OK)
        alert(j.error || `Génération échouée (HTTP ${r.status})`);
        return;
      }
      setAiPreview(j.images || []);
      if (j.fallbackFromVideo) alert(j.message);
    } catch (e: any) {
      alert('Erreur réseau : ' + (e?.message || e));
    } finally { setAiBusy(null); }
  }

  async function useAiImage(img: { data: string; mimeType: string }) {
    setUploadBusy(true);
    try {
      const r = await fetch('/api/admin/ai/save-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: img.data, mimeType: img.mimeType, name: presetSlug || 'banner-ai' })
      });
      const j = await r.json();
      if (j.url) { setMediaUrl(j.url); setMediaType('image'); setAiPreview([]); }
    } finally { setUploadBusy(false); }
  }

  async function uploadMedia(f: File) {
    // Pré-check côté client : 100 MB max, avertit pour vidéos > 20 MB
    const sizeMb = f.size / 1024 / 1024;
    if (sizeMb > 100) {
      alert(`Fichier trop volumineux : ${sizeMb.toFixed(1)} MB. Max 100 MB.\n\nConseil pour vidéo hero :\n• H.264 / MP4\n• 720p ou 1080p\n• 5-10 secondes en boucle\n• Bitrate bas (1-2 Mbps)\n• Cible : 5-15 MB\n\nUtilise HandBrake ou ffmpeg : ffmpeg -i input.mov -c:v libx264 -crf 28 -preset slow -vf scale=1280:-2 -an output.mp4`);
      return;
    }
    if (f.type.startsWith('video/') && sizeMb > 20) {
      if (!confirm(`Vidéo de ${sizeMb.toFixed(1)} MB.\n\nC'est lourd pour un hero — le visiteur attendra avant de voir le site.\n\nRecommandé : < 10 MB. Compresser avec ffmpeg ?\n\nContinuer quand même ?`)) return;
    }
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append('files', f);
      const r = await fetch('/api/admin/media', { method: 'POST', body: fd });
      if (!r.ok) {
        let msg = `Upload échoué (HTTP ${r.status})`;
        try {
          const j = await r.json();
          if (j.error) msg = j.error;
        } catch { /* ignore */ }
        // Erreur typique 413 reverse proxy
        if (r.status === 413) {
          msg = `Body trop gros pour le reverse proxy.\n\nLe serveur (Caddy/Coolify) limite la taille des uploads. Solutions :\n1. Compresse la vidéo (< 10 MB recommandé)\n2. Augmente la limite dans Coolify : Settings → Proxy → request_body_size 100M`;
        }
        alert(msg);
        return;
      }
      const j = await r.json();
      if (j.ok && j.files?.[0]) {
        const file = j.files[0];
        setMediaUrl(file.url);
        setMediaType(file.mime.startsWith('video/') ? 'video' : 'image');
      } else {
        alert(j.error || 'Upload échoué (réponse vide)');
      }
    } catch (e: any) {
      alert(`Erreur réseau : ${e.message || 'inconnue'}`);
    } finally {
      setUploadBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    const url = banner ? `/api/admin/banners/${banner.id}` : '/api/admin/banners';
    const method = banner ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eyebrow, title, subtitle, mediaUrl, mediaType, cta1Text, cta1Url, cta2Text, cta2Url, accentColor,
        aiPrompt: aiPrompt || null,
        presetSlug: presetSlug || null,
        siteScope: siteScope || null,
        activeFrom: activeFrom || null,
        activeUntil: activeUntil || null,
        linkedThemeSlug: linkedThemeSlug || null
      })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.banner);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-zinc-800 flex items-center justify-between p-4">
          <h2 className="font-bold">{banner ? 'Éditer la bannière' : 'Nouvelle bannière'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto">
          <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Sur-titre (« Manifeste », « Galerie », etc.)"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm uppercase tracking-widest" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre principal"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xl font-bold" />
          <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={3} placeholder="Sous-titre"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Image ou vidéo de fond (optionnel)</span>
              <button onClick={() => fileRef.current?.click()} disabled={uploadBusy} className="btn-ghost text-xs">
                {uploadBusy ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Téléverser
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden
                onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])} />
            </div>
            {mediaUrl && (
              <div className="rounded-lg overflow-hidden bg-zinc-800 mb-2 max-h-48">
                {mediaType === 'video'
                  ? <video src={mediaUrl} controls className="w-full max-h-48" />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={mediaUrl} alt="" className="w-full max-h-48 object-cover" />
                }
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-2">
            <input value={cta1Text} onChange={(e) => setCta1Text(e.target.value)} placeholder="Bouton 1 — texte"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input value={cta1Url} onChange={(e) => setCta1Url(e.target.value)} placeholder="Bouton 1 — URL"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input value={cta2Text} onChange={(e) => setCta2Text(e.target.value)} placeholder="Bouton 2 — texte"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            <input value={cta2Url} onChange={(e) => setCta2Url(e.target.value)} placeholder="Bouton 2 — URL"
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Couleur */}
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Couleur d'accent</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-12 h-10 rounded cursor-pointer bg-transparent" />
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono w-32" />
              {['#FF2BB1', '#FBBF24', '#34D399', '#22D3EE', '#8B5CF6'].map((c) => (
                <button key={c} onClick={() => setAccentColor(c)} className="w-7 h-7 rounded-full border-2 border-white/10" style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* === GÉNÉRATEUR IA Higgsfield (image + vidéo) === */}
          <div className="bg-fuchsia-500/5 border border-fuchsia-500/30 rounded-xl p-3 space-y-2">
            <div className="text-xs uppercase font-bold text-fuchsia-300 flex items-center gap-1.5">✨ Générer avec Higgsfield AI (image + vidéo)</div>

            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(p => (
                <button
                  type="button"
                  key={p.slug}
                  onClick={() => applyPreset(p.slug)}
                  className={`text-[11px] px-2 py-1 rounded-full ${presetSlug === p.slug ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              placeholder="Prompt IA (préréglage déjà rempli, modifie librement)"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => generateAI('image')}
                disabled={!!aiBusy}
                className={`bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${aiBusy === 'image' ? 'ai-glow ai-glow-subtle' : ''}`}
              >
                {aiBusy === 'image' ? <Loader2 size={11} className="animate-spin" /> : '🖼'}
                {aiBusy === 'image' ? 'IA génère…' : 'Générer image (Higgsfield + Gemini fallback)'}
              </button>
              <button
                type="button"
                onClick={() => generateAI('video')}
                disabled={!!aiBusy}
                className={`bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${aiBusy === 'video' ? 'ai-glow ai-glow-subtle' : ''}`}
                title="Génère une vidéo via Higgsfield AI. Si la clé Higgsfield n'est pas configurée, fallback automatique sur 4 images Imagen en carrousel."
              >
                {aiBusy === 'video' ? <Loader2 size={11} className="animate-spin" /> : '🎥'}
                {aiBusy === 'video' ? 'Higgsfield génère…' : 'Générer vidéo (Higgsfield)'}
              </button>
            </div>

            {/* Paramètres Higgsfield — affichés uniquement quand on prépare une vidéo */}
            <details className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5">
              <summary className="cursor-pointer text-[11px] font-bold text-violet-300 hover:text-violet-200">
                ▸ Paramètres vidéo Higgsfield
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <label className="flex flex-col gap-1">
                  <span className="text-zinc-400">Modèle</span>
                  <select
                    value={hfModel}
                    onChange={(e) => setHfModel(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                  >
                    <option value="higgsfield-lite">Lite (rapide, économique, 5s max)</option>
                    <option value="higgsfield-standard">Standard (qualité supérieure, 10s)</option>
                    <option value="higgsfield-turbo">Turbo (ultra rapide, 5s)</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-zinc-400">Durée (s)</span>
                  <input
                    type="number" min={3} max={10} step={1}
                    value={hfDuration}
                    onChange={(e) => setHfDuration(parseInt(e.target.value) || 5)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-zinc-400">Intensité mouvement</span>
                  <select
                    value={hfMotion}
                    onChange={(e) => setHfMotion(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-100"
                  >
                    <option value="low">Faible (doux, atmosphérique)</option>
                    <option value="medium">Moyen (équilibré)</option>
                    <option value="high">Fort (cinématique, dynamique)</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-1">
                  <input
                    type="checkbox" checked={hfLoop}
                    onChange={(e) => setHfLoop(e.target.checked)}
                    className="accent-violet-500"
                  />
                  <span className="text-zinc-300">Boucle parfaite (recommandé pour bannière)</span>
                </label>
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                💡 <b>Image</b> : Higgsfield Soul (fal.ai) avec fallback automatique sur <b>Gemini 2.5 Flash Image</b> alias <i>Nano Banana</i> si fal.ai n&apos;est pas configuré.<br />
                <b>Vidéo</b> : Higgsfield via fal.ai uniquement. Clé à configurer dans <code>/admin/settings → 🎬 Higgsfield</code> (fal.ai API key, 10$ offerts à l&apos;inscription).
              </p>
            </details>

            {aiPreview.length > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                {aiPreview.map((img, i) => (
                  <div key={i} className="relative rounded overflow-hidden border border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:${img.mimeType};base64,${img.data}`} alt="" className="w-full aspect-video object-cover" />
                    <button
                      type="button"
                      onClick={() => useAiImage(img)}
                      className="absolute bottom-1 right-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full"
                    >
                      ✓ Utiliser
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* === CALENDRIER D'ACTIVATION === */}
          <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-xl p-3 space-y-2">
            <div className="text-xs uppercase font-bold text-cyan-300">📅 Calendrier d'activation (optionnel)</div>
            <p className="text-[10px] text-zinc-400">Si vide, la bannière est toujours affichée. Si rempli, visible uniquement entre ces dates.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Active du</span>
                <input type="date" value={activeFrom} onChange={(e) => setActiveFrom(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs" />
              </label>
              <label className="block">
                <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">Jusqu'au</span>
                <input type="date" value={activeUntil} onChange={(e) => setActiveUntil(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs" />
              </label>
            </div>
            <label className="block">
              <span className="text-[9px] uppercase text-zinc-500 block mb-0.5">OU lier à un thème (slug)</span>
              <input value={linkedThemeSlug} onChange={(e) => setLinkedThemeSlug(e.target.value)} placeholder="ex: pride-rainbow, noel-classique, halloween…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs font-mono" />
            </label>
            <p className="text-[9px] text-zinc-500">💡 Si lié à un thème : la bannière apparaît dès que le thème est actif (manuellement ou par auto-activation date).</p>

            {/* Scope multi-front : Paris / France / les 2 */}
            <div className="pt-3 mt-3 border-t border-zinc-800">
              <span className="text-[9px] uppercase text-zinc-500 block mb-2 font-bold">🎯 Apparaît sur quel front ?</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSiteScope('')}
                  className={`text-[11px] py-2 px-2 rounded-lg font-bold transition ${siteScope === '' ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
                  title="Banner visible sur Paris ET France"
                >
                  🌈 Les 2 fronts
                </button>
                <button
                  type="button"
                  onClick={() => setSiteScope('paris')}
                  className={`text-[11px] py-2 px-2 rounded-lg font-bold transition ${siteScope === 'paris' ? 'bg-pink-500 text-white shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
                  title="Banner visible uniquement sur parislgbt.com"
                >
                  🌸 Paris uniquement
                </button>
                <button
                  type="button"
                  onClick={() => setSiteScope('france')}
                  className={`text-[11px] py-2 px-2 rounded-lg font-bold transition ${siteScope === 'france' ? 'bg-violet-500 text-white shadow-lg' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'}`}
                  title="Banner visible uniquement sur lgbtfrance.fr"
                >
                  🏳️‍🌈 France uniquement
                </button>
              </div>
              <p className="text-[9px] text-zinc-500 mt-1.5">💡 Sur staging (lgbt.pixeeplay.com) toutes les bannières sont visibles. Le scope filtre uniquement en prod ou avec ?preview=paris|france.</p>
            </div>
          </div>
        </div>
        <div className="border-t border-zinc-800 p-4 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy || !title} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            {banner ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
