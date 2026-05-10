'use client';
import { useState } from 'react';
import { Sparkles, Loader2, X, Image as ImageIcon, Video, Wand2 } from 'lucide-react';

type Kind = 'image' | 'parallax-bg' | 'parallax-mid' | 'parallax-fg' | 'video-prompt' | 'video';

const KIND_META: Record<Kind, { label: string; emoji: string; defaultPrompt: string; aspectRatio: string }> = {
  image:           { label: 'Image générique',          emoji: '🖼', defaultPrompt: 'Communauté inclusive en cercle, lumière dorée golden hour, palette violet rose cyan',         aspectRatio: '16:9' },
  'parallax-bg':   { label: 'Fond parallax (sky/loin)', emoji: '🏔', defaultPrompt: 'Montagnes au coucher du soleil, ciel violet et orange, vue ultra-large, brume légère',          aspectRatio: '16:9' },
  'parallax-mid':  { label: 'Layer milieu (PNG transparent)',  emoji: '⛰', defaultPrompt: 'Collines en silhouette, type découpe, à utiliser en milieu de scène',                       aspectRatio: '16:9' },
  'parallax-fg':   { label: 'Layer foreground (PNG transparent)', emoji: '🌳', defaultPrompt: 'Herbes hautes en silhouette, premier plan, vue par dessous',                              aspectRatio: '16:9' },
  'video-prompt':  { label: 'Prompt vidéo',             emoji: '📝', defaultPrompt: 'Scène lente cinématique de cercle de prière inclusif, dolly-in, golden hour',                   aspectRatio: '16:9' },
  video:           { label: 'Vidéo IA',                 emoji: '🎬', defaultPrompt: 'Cinematic slow dolly-in on a diverse community circle praying, golden hour, warm tones',         aspectRatio: '16:9' }
};

interface Props {
  kind: Kind;
  onGenerated: (url: string) => void;
  className?: string;
  label?: string;
}

export function AiMediaButton({ kind, onGenerated, className = '', label }: Props) {
  const [open, setOpen] = useState(false);
  const meta = KIND_META[kind];
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`bg-gradient-to-r from-amber-400/20 to-fuchsia-500/20 hover:from-amber-400/30 hover:to-fuchsia-500/30 text-amber-300 hover:text-amber-200 ring-1 ring-amber-500/40 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition ${className}`}
        title={`Générer ${meta.label} avec IA`}
      >
        <Sparkles size={9} />
        {label || `IA ${meta.emoji}`}
      </button>
      {open && (
        <AiMediaModal
          kind={kind}
          onClose={() => setOpen(false)}
          onSelected={(url) => { setOpen(false); onGenerated(url); }}
        />
      )}
    </>
  );
}

function AiMediaModal({ kind, onClose, onSelected }: { kind: Kind; onClose: () => void; onSelected: (url: string) => void }) {
  const meta = KIND_META[kind];
  const [prompt, setPrompt] = useState(meta.defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState(meta.aspectRatio);
  const [count, setCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) { alert('Décris ce que tu veux générer'); return; }
    setGenerating(true);
    setError(null);
    setResults([]);
    setVideoUrl(null);
    setVideoPrompt(null);
    try {
      const r = await fetch('/api/admin/page-builder/generate-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, prompt: prompt.trim(), aspectRatio, count: kind.startsWith('video') ? 1 : count })
      });
      const j = await r.json();
      if (j.ok) {
        if (j.images) setResults(j.images);
        if (j.videoUrl) setVideoUrl(j.videoUrl);
        if (j.prompt) setVideoPrompt(j.prompt);
      } else {
        setError(j.error + (j.hint ? '\n\n' + j.hint : ''));
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
    }
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-zinc-950 border border-amber-500/40 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <header className="bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 border-b border-amber-500/30 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center text-xl">{meta.emoji}</div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-1.5"><Wand2 size={14} /> Générer {meta.label}</h3>
            <p className="text-[11px] text-zinc-300">Imagen 3 / Gemini Flash Image / fal.ai Seedance</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white"><X size={16} /></button>
        </header>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <label className="block text-xs">
            <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Description</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={meta.defaultPrompt}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
            />
            {(kind === 'parallax-mid' || kind === 'parallax-fg') && (
              <p className="text-[10px] text-amber-300 mt-1">💡 PNG transparent — décris juste l'élément, le fond sera transparent.</p>
            )}
          </label>

          {!kind.startsWith('video') && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Aspect ratio</span>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
                  <option value="16:9">16:9 — paysage</option>
                  <option value="9:16">9:16 — vertical</option>
                  <option value="1:1">1:1 — carré</option>
                  <option value="4:3">4:3 — classique</option>
                </select>
              </label>
              <label className="block text-xs">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Nombre de variantes</span>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs">
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-[11px] text-rose-300 whitespace-pre-wrap">⚠ {error}</div>
          )}

          {videoPrompt && (
            <div className="bg-emerald-500/10 ring-1 ring-emerald-500/30 rounded-lg p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-1">📝 Prompt vidéo généré</p>
              <p className="text-xs text-zinc-200 italic">"{videoPrompt}"</p>
              <button
                onClick={() => { navigator.clipboard.writeText(videoPrompt); }}
                className="mt-2 text-[10px] bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 px-2 py-1 rounded"
              >📋 Copier</button>
              <p className="text-[10px] text-zinc-500 mt-2">Colle ce prompt dans <a href="https://gemini.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">Veo via Gemini</a> · <a href="https://runwayml.com" target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">Runway</a> · <a href="https://openai.com/sora" target="_blank" rel="noopener noreferrer" className="text-emerald-300 underline">Sora</a>.</p>
            </div>
          )}

          {videoUrl && (
            <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-lg p-2">
              <video src={videoUrl} controls className="w-full rounded" />
              <button onClick={() => onSelected(videoUrl)} className="mt-2 w-full bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-3 py-2 rounded">Utiliser cette vidéo</button>
            </div>
          )}

          {results.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">{results.length} variante(s) — clique pour utiliser</p>
              <div className={`grid gap-2 ${results.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {results.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => onSelected(src)}
                    className="group relative aspect-video bg-zinc-900 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-lg overflow-hidden transition"
                  >
                    <img src={src} alt={`Variante ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-2">
                      <span className="text-xs text-white font-bold">✓ Utiliser</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="bg-zinc-900 border-t border-zinc-800 p-3 flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Fermer</button>
          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="bg-gradient-to-r from-amber-400 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1.5 shadow-lg"
          >
            {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {generating ? 'Génération…' : results.length > 0 || videoUrl || videoPrompt ? 'Régénérer' : 'Générer'}
          </button>
        </footer>
      </div>
    </div>
  );
}
