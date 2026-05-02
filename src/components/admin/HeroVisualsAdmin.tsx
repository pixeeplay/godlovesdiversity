'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Save, Loader2, Wand2, Trash2, Check } from 'lucide-react';
import { StainedGlassVisual } from '@/components/StainedGlassVisual';

type Preset = 'hero_man' | 'hero_woman' | 'hero_group' | 'hero_praying' | 'mosque' | 'synagogue' | 'temple';

const PRESET_LABELS: Record<Preset, string> = {
  hero_man: 'Homme dans cathédrale',
  hero_woman: 'Femme dans cathédrale',
  hero_group: 'Groupe inclusif',
  hero_praying: 'Prière',
  mosque: 'Mosquée',
  synagogue: 'Synagogue',
  temple: 'Temple bouddhiste'
};

export function HeroVisualsAdmin() {
  // Settings
  const [style, setStyle] = useState<'svg' | 'ai' | 'off'>('svg');
  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Generation
  const [preset, setPreset] = useState<Preset>('hero_man');
  const [customPrompt, setCustomPrompt] = useState('');
  const [count, setCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ data: string; mimeType: string }[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((j) => {
      if (j['visuals.heroStyle']) setStyle(j['visuals.heroStyle'] as any);
      if (j['visuals.heroAiUrls']) {
        try { setSavedUrls(JSON.parse(j['visuals.heroAiUrls'])); } catch {}
      }
    }).catch(() => {});
  }, []);

  async function generate() {
    setGenerating(true); setError(''); setGenerated([]);
    try {
      const r = await fetch('/api/admin/ai/generate-image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset, prompt: customPrompt || undefined, count })
      });
      const j = await r.json();
      if (j.error) { setError(j.error); return; }
      setGenerated(j.images || []);
    } catch (e: any) {
      setError(e.message);
    }
    setGenerating(false);
  }

  async function saveImage(img: { data: string; mimeType: string }) {
    const r = await fetch('/api/admin/ai/save-image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: img.data, mimeType: img.mimeType, name: preset })
    });
    const j = await r.json();
    if (j.url) {
      const next = [...savedUrls, j.url];
      setSavedUrls(next);
      await persistSettings(style, next);
    }
  }

  async function removeUrl(idx: number) {
    const next = savedUrls.filter((_, i) => i !== idx);
    setSavedUrls(next);
    await persistSettings(style, next);
  }

  async function persistSettings(newStyle: typeof style, urls: string[]) {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'visuals.heroStyle': newStyle,
        'visuals.heroAiUrls': JSON.stringify(urls)
      })
    });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  function setStyleAndSave(s: typeof style) {
    setStyle(s);
    persistSettings(s, savedUrls);
  }

  return (
    <div className="space-y-6">
      {/* TOGGLE STYLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={18} /> Style des visuels du site</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Choisis ce qui s'affiche en placeholder partout (hero, fallbacks, etc.).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Choice label="🎨 SVG vitrail (rapide, gratuit)" value="svg" current={style} onChange={setStyleAndSave}>
            <div className="aspect-video rounded-lg overflow-hidden bg-black mt-2">
              <StainedGlassVisual variant="man" />
            </div>
          </Choice>
          <Choice label="✨ Images IA générées" value="ai" current={style} onChange={setStyleAndSave} disabled={savedUrls.length === 0}>
            {savedUrls[0] ? (
              <img src={savedUrls[0]} alt="" className="aspect-video rounded-lg object-cover w-full mt-2" />
            ) : (
              <div className="aspect-video rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 mt-2">
                Génère ci-dessous d'abord
              </div>
            )}
          </Choice>
          <Choice label="❌ Désactivé" value="off" current={style} onChange={setStyleAndSave}>
            <div className="aspect-video rounded-lg bg-black mt-2" />
          </Choice>
        </div>
        {savedAt && (
          <p className="mt-3 text-xs text-emerald-400 flex items-center gap-1"><Check size={12} /> Préférence enregistrée</p>
        )}
      </div>

      {/* GÉNÉRATION IA */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2"><Wand2 size={18} className="text-brand-pink" /> Générer des visuels IA</h3>
        <p className="text-sm text-zinc-400">
          Utilise Google Imagen (clé Gemini) pour créer des visuels photorealistic style "homme/femme dans une cathédrale avec faisceau arc-en-ciel".
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Préréglage</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
              {(Object.keys(PRESET_LABELS) as Preset[]).map((k) => (
                <option key={k} value={k}>{PRESET_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nombre</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    value={count} onChange={(e) => setCount(Number(e.target.value))}>
              <option value={1}>1 image</option>
              <option value={2}>2 images</option>
              <option value={3}>3 images</option>
              <option value={4}>4 images</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={generating}
                    className="w-full bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2">
              {generating ? <><Loader2 size={14} className="animate-spin" /> Génération…</> : <><Sparkles size={14} /> Générer</>}
            </button>
          </div>
        </div>

        <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                  placeholder="Prompt personnalisé (optionnel — laisse vide pour utiliser le préréglage)"
                  value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {generated.length > 0 && (
          <div>
            <p className="text-sm text-zinc-300 mb-2">Cliquer sur 💾 pour ajouter à la bibliothèque hero :</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {generated.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-800">
                  <img src={`data:${img.mimeType};base64,${img.data}`} alt="" className="w-full aspect-video object-cover" />
                  <button onClick={() => saveImage(img)}
                          className="absolute top-2 right-2 bg-brand-pink hover:bg-pink-600 text-white rounded-full p-2 shadow-lg">
                    <Save size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* BIBLIOTHÈQUE */}
      {savedUrls.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3">Bibliothèque hero ({savedUrls.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {savedUrls.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-zinc-800">
                <img src={url} alt="" className="w-full aspect-video object-cover" />
                <button onClick={() => removeUrl(i)}
                        className="absolute top-1 right-1 bg-red-900/80 hover:bg-red-800 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Choice<T extends string>({ label, value, current, onChange, disabled, children }: { label: string; value: T; current: T; onChange: (v: T) => void; disabled?: boolean; children: React.ReactNode }) {
  const sel = current === value;
  return (
    <button onClick={() => !disabled && onChange(value)} disabled={disabled}
            className={`text-left p-3 rounded-xl border-2 transition disabled:opacity-40 disabled:cursor-not-allowed
              ${sel ? 'border-brand-pink bg-brand-pink/10' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950'}`}>
      <div className="font-bold text-sm flex items-center gap-2">
        {sel && <Check size={14} className="text-brand-pink" />}
        {label}
      </div>
      {children}
    </button>
  );
}
