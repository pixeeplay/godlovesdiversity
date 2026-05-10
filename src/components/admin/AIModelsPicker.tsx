'use client';
import { useEffect, useState } from 'react';
import { Sparkles, Image as ImageIcon, Music, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

/**
 * Section sélecteur de modèles IA — surcouche au-dessus de /admin/secrets pour ne pas
 * avoir à manipuler des chaînes de caractères pour des choix simples.
 *
 * Picker:
 *   - Gemini text model
 *   - Gemini image model
 *   - ElevenLabs voice
 *
 * Sauvegarde via /api/admin/secrets PUT (key=GEMINI_TEXT_MODEL, etc.).
 */

const GEMINI_TEXT_MODELS = [
  { id: 'gemini-3-flash',           label: 'Gemini 3 Flash',          desc: 'Rapide, qualité élevée — recommandé' },
  { id: 'gemini-3-pro',             label: 'Gemini 3 Pro',            desc: 'Meilleure qualité, plus lent + cher' },
  { id: 'gemini-2.5-flash',         label: 'Gemini 2.5 Flash',        desc: 'Stable, équilibre coût/qualité' },
  { id: 'gemini-2.5-pro',           label: 'Gemini 2.5 Pro',          desc: 'Long contexte, raisonnement avancé' },
  { id: 'gemini-2.5-flash-lite',    label: 'Gemini 2.5 Flash Lite',   desc: 'Le moins cher, pour cleaning RAG' }
];

const GEMINI_IMAGE_MODELS = [
  { id: 'imagen-3.0-generate-002',  label: 'Imagen 3 (generate)',    desc: 'Photoréaliste, prod-ready' },
  { id: 'imagen-3.0-fast-generate-001', label: 'Imagen 3 Fast',      desc: 'Plus rapide, qualité légèrement moindre' },
  { id: 'gemini-2.5-flash-image',   label: 'Gemini 2.5 Flash Image', desc: 'Multimodal, supporte editing' }
];

const ELEVENLABS_VOICES = [
  { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel — anglaise calme', lang: 'en' },
  { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi — anglaise dynamique', lang: 'en' },
  { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam — anglaise grave (narration)', lang: 'en' },
  { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold — anglaise crisp', lang: 'en' },
  { id: 'XB0fDUnXU5powFXDhCwa', label: 'Charlotte — multilingue (FR ok)', lang: 'multi' },
  { id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda — anglaise narratrice', lang: 'en' },
  { id: 'oWAxZoHRU5VYUNNvFNQE', label: 'Grace — anglaise UK douce', lang: 'en' },
  { id: 'onwK4e9ZLuTAKqWW03F9', label: 'Daniel — anglais UK news', lang: 'en' },
  { id: 'ZQe5CZNOzWyzPSCn5a3c', label: 'James — australien grave', lang: 'en' }
];

export function AIModelsPicker() {
  const [textModel, setTextModel] = useState<string>('');
  const [imageModel, setImageModel] = useState<string>('');
  const [elevenVoice, setElevenVoice] = useState<string>('');
  const [hasGemini, setHasGemini] = useState(false);
  const [hasEleven, setHasEleven] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/secrets', { cache: 'no-store' });
      const j = await r.json();
      const map: Record<string, any> = {};
      (j.secrets || []).forEach((sec: any) => { map[sec.key] = sec; });
      setHasGemini(map['GEMINI_API_KEY']?.configured || false);
      setHasEleven(map['ELEVENLABS_API_KEY']?.configured || false);
      // Note : on ne peut pas récupérer la valeur exacte (masquée) — on laisse vide
      setTextModel('');
      setImageModel('');
      setElevenVoice('');
    } finally {
      setLoading(false);
    }
  }

  async function saveSecret(key: string, value: string) {
    setSaving(key);
    await fetch('/api/admin/secrets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
    setSaving(null);
    setSavedKey(key);
    setTimeout(() => setSavedKey(null), 2000);
  }

  useEffect(() => { load(); }, []);

  if (loading) return null;

  return (
    <section className="space-y-4 mb-6">
      {/* GEMINI */}
      <div className="bg-gradient-to-br from-violet-950/50 to-zinc-900 ring-1 ring-violet-500/30 rounded-2xl p-5">
        <header className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base flex items-center gap-2">
              Modèles Gemini AI
              {hasGemini ? (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">connecté</span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">clé manquante</span>
              )}
            </h2>
            <p className="text-xs text-zinc-400">Génération de texte (Gemini) et d'image (Imagen). {!hasGemini && (
              <>Récupère ta clé sur <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-violet-300 underline inline-flex items-center gap-0.5">aistudio.google.com/apikey <ExternalLink size={10} /></a> et configure <code className="bg-zinc-800 px-1 rounded">GEMINI_API_KEY</code> ci-dessous.</>
            )}</p>
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-3">
          {/* Text */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-violet-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles size={10} /> Modèle texte
            </label>
            <select
              value={textModel}
              onChange={(e) => { setTextModel(e.target.value); if (e.target.value) saveSecret('GEMINI_TEXT_MODEL', e.target.value); }}
              disabled={saving === 'GEMINI_TEXT_MODEL'}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            >
              <option value="">— Garder valeur actuelle —</option>
              {GEMINI_TEXT_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">{textModel ? GEMINI_TEXT_MODELS.find((m) => m.id === textModel)?.desc : 'Valeur stockée masquée — choisis pour overrider'}</p>
            {savedKey === 'GEMINI_TEXT_MODEL' && <p className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1"><CheckCircle2 size={10} /> Sauvegardé</p>}
          </div>

          {/* Image */}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-fuchsia-300 mb-1.5 flex items-center gap-1.5">
              <ImageIcon size={10} /> Modèle image
            </label>
            <select
              value={imageModel}
              onChange={(e) => { setImageModel(e.target.value); if (e.target.value) saveSecret('GEMINI_IMAGE_MODEL', e.target.value); }}
              disabled={saving === 'GEMINI_IMAGE_MODEL'}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="">— Garder valeur actuelle —</option>
              {GEMINI_IMAGE_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <p className="text-[10px] text-zinc-500 mt-1">{imageModel ? GEMINI_IMAGE_MODELS.find((m) => m.id === imageModel)?.desc : 'Imagen 3 recommandé pour Studio IA'}</p>
            {savedKey === 'GEMINI_IMAGE_MODEL' && <p className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1"><CheckCircle2 size={10} /> Sauvegardé</p>}
          </div>
        </div>
      </div>

      {/* ELEVENLABS */}
      <div className="bg-gradient-to-br from-rose-950/40 to-zinc-900 ring-1 ring-rose-500/30 rounded-2xl p-5">
        <header className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shrink-0">
            <Music size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base flex items-center gap-2">
              ElevenLabs (musique IA + voix)
              {hasEleven ? (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">connecté</span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">clé manquante</span>
              )}
            </h2>
            <p className="text-xs text-zinc-400">Synthèse vocale ultra-réaliste + génération musique. {!hasEleven && (
              <>Récupère ta clé sur <a href="https://elevenlabs.io/api" target="_blank" rel="noopener noreferrer" className="text-rose-300 underline inline-flex items-center gap-0.5">elevenlabs.io/api <ExternalLink size={10} /></a> et configure <code className="bg-zinc-800 px-1 rounded">ELEVENLABS_API_KEY</code>.</>
            )}</p>
          </div>
        </header>

        <div>
          <label className="block text-[10px] uppercase tracking-widest font-bold text-rose-300 mb-1.5">Voix par défaut</label>
          <select
            value={elevenVoice}
            onChange={(e) => { setElevenVoice(e.target.value); if (e.target.value) saveSecret('ELEVENLABS_VOICE_ID', e.target.value); }}
            disabled={!hasEleven || saving === 'ELEVENLABS_VOICE_ID'}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
          >
            <option value="">— Garder valeur actuelle —</option>
            {ELEVENLABS_VOICES.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.lang})</option>)}
          </select>
          {savedKey === 'ELEVENLABS_VOICE_ID' && <p className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1"><CheckCircle2 size={10} /> Sauvegardé</p>}
          <p className="text-[10px] text-zinc-500 mt-1">Charlotte est polyglotte — bien pour FR/EN sans accent.</p>
        </div>
      </div>
    </section>
  );
}
