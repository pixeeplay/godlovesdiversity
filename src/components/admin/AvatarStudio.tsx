'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Video, Sparkles, Save, Loader2, CheckCircle2, AlertCircle, Play, Pause,
  Volume2, ExternalLink, Power, PowerOff, Eye, KeyRound, Zap, RefreshCw, type LucideIcon
} from 'lucide-react';

type Avatar = {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
  preview_video_url?: string;
  gender?: string;
};

type Voice = {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
};

type Config = {
  enabled: boolean;
  streamingEnabled: boolean;
  streamingAvatarName: string;
  localLiveEnabled: boolean;
  avatarId: string;
  voiceId: string;
  bgColor: string;
  dailyCap: number;
};

type Props = {
  apiKeyConfigured: boolean;
  hasElevenLabs?: boolean;
  initialConfig: Config;
};

const BG_PRESETS = [
  { color: '#FBEAF0', label: 'Rose GLD' },
  { color: '#EEEDFE', label: 'Violet doux' },
  { color: '#E1F5EE', label: 'Vert serein' },
  { color: '#E6F1FB', label: 'Bleu ciel' },
  { color: '#FAEEDA', label: 'Ambre chaud' },
  { color: '#0F0F12', label: 'Nuit profonde' }
];

export function AvatarStudio({ apiKeyConfigured, hasElevenLabs = false, initialConfig }: Props) {
  const [config, setConfig] = useState<Config>(initialConfig);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [savedCfg, setSavedCfg] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Test live
  const [testQuestion, setTestQuestion] = useState('');
  const [testing, setTesting] = useState(false);
  const [testVideo, setTestVideo] = useState<{ id: string; status: string; url?: string; answer?: string; sources?: any[]; errorMessage?: string } | null>(null);

  useEffect(() => {
    if (apiKeyConfigured) loadAvatars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeyConfigured]);

  async function loadAvatars() {
    setLoadingList(true);
    setListError(null);
    try {
      const r = await fetch('/api/admin/avatar/list');
      const j = await r.json();
      if (r.ok) {
        setAvatars(j.avatars || []);
        setVoices(j.voices || []);
        setQuota(j.quota?.remainingCredits ?? null);
      } else {
        setListError(j.error || 'Erreur de chargement');
      }
    } catch (e: any) {
      setListError(e?.message || 'Erreur réseau');
    }
    setLoadingList(false);
  }

  async function saveConfig() {
    setSavingCfg(true);
    setSavedCfg(false);
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'avatar.enabled': config.enabled ? '1' : '0',
        'avatar.streaming.enabled': config.streamingEnabled ? '1' : '0',
        'avatar.streaming.avatarName': config.streamingAvatarName,
        'avatar.local.enabled': config.localLiveEnabled ? '1' : '0',
        'avatar.heygen.avatarId': config.avatarId,
        'avatar.heygen.voiceId': config.voiceId,
        'avatar.heygen.bgColor': config.bgColor,
        'avatar.dailyCapPerVisitor': String(config.dailyCap)
      })
    });
    setSavingCfg(false);
    setSavedCfg(true);
    setTimeout(() => setSavedCfg(false), 2200);
  }

  async function runTest() {
    if (!testQuestion.trim()) return;
    setTesting(true);
    setTestVideo(null);
    try {
      const r = await fetch('/api/avatar/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: testQuestion, locale: 'fr' })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur génération');
      setTestVideo({ id: j.video_id, status: 'pending', answer: j.answer, sources: j.sources });
      // Poll
      pollVideoStatus(j.video_id);
    } catch (e: any) {
      setTestVideo({ id: '', status: 'failed', answer: e.message });
    }
    setTesting(false);
  }

  async function pollVideoStatus(videoId: string) {
    const maxAttempts = 40; // ~2 minutes max
    let attempt = 0;
    const tick = async () => {
      if (attempt++ >= maxAttempts) {
        setTestVideo((v) => v ? { ...v, status: 'timeout' } : null);
        return;
      }
      try {
        const r = await fetch(`/api/avatar/status?id=${videoId}`);
        const j = await r.json();
        if (j.status === 'completed' && j.video_url) {
          setTestVideo((v) => v ? { ...v, status: 'completed', url: j.video_url } : null);
          return;
        }
        if (j.status === 'failed') {
          const errMsg = j.error?.message || j.error || 'Génération vidéo refusée par HeyGen';
          setTestVideo((v) => v ? { ...v, status: 'failed', errorMessage: errMsg } : null);
          return;
        }
        setTestVideo((v) => v ? { ...v, status: j.status } : null);
        setTimeout(tick, 3500);
      } catch {
        setTimeout(tick, 4000);
      }
    };
    tick();
  }

  const currentAvatar = useMemo(() => avatars.find((a) => a.avatar_id === config.avatarId), [avatars, config.avatarId]);
  const currentVoice = useMemo(() => voices.find((v) => v.voice_id === config.voiceId), [voices, config.voiceId]);

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* HEADER */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-2.5">
            <Video size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">GLD Live — Avatar vidéo</h1>
          <span className="bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            HeyGen
          </span>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Un avatar humain chaleureux qui répond aux visiteurs <strong>en vidéo</strong>, en utilisant la même bibliothèque que le chat texte (RAG).
        </p>
      </header>

      {/* CHOIX DU MODE D'AVATAR — 2 grosses cartes côte à côte */}
      <section>
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <Sparkles size={20} className="text-fuchsia-400" />
          Choisis comment ton avatar parle aux visiteurs
        </h2>
        <p className="text-sm text-zinc-400 mb-4">Les 2 modes peuvent coexister — le visiteur choisit lequel utiliser dans le widget chat.</p>

        <div className="grid md:grid-cols-2 gap-4">
          {/* CARTE MODE VIDÉO HEYGEN */}
          <div className={`rounded-2xl border-2 overflow-hidden transition
            ${config.enabled
              ? 'border-fuchsia-500 bg-fuchsia-500/5 shadow-lg shadow-fuchsia-500/10'
              : 'border-zinc-800 bg-zinc-900/50'}`}>
            <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 p-4 text-white">
              <div className="flex items-start justify-between mb-2">
                <Video size={28} />
                <span className="bg-white/20 backdrop-blur text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                  HeyGen Vidéo
                </span>
              </div>
              <h3 className="text-xl font-bold">Mode Vidéo</h3>
              <p className="text-sm opacity-90 mt-1">L'avatar enregistre une vidéo MP4 ~30s pour chaque réponse</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-zinc-300">Avatar humain photo-réaliste</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-zinc-300">Voix douce, lip-sync parfait</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">−</span>
                  <span className="text-zinc-400">~30 secondes d'attente par question</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">−</span>
                  <span className="text-zinc-400">Crédits HeyGen consommés (~0.10 €/vidéo)</span>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-500">Statut clé HeyGen</span>
                  {apiKeyConfigured
                    ? <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Configurée</span>
                    : <span className="text-red-300 flex items-center gap-1"><AlertCircle size={11} /> Manquante</span>}
                </div>
                {!apiKeyConfigured && (
                  <a href="/admin/settings" className="text-fuchsia-300 hover:underline text-[11px] flex items-center gap-1 mt-1">
                    <KeyRound size={10} /> Configurer dans Paramètres → IA & Outils → HeyGen
                  </a>
                )}
              </div>

              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${config.enabled ? 'bg-fuchsia-500/10 border-fuchsia-500/40' : 'bg-zinc-800/50 border-zinc-700'} ${!apiKeyConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input type="checkbox"
                  disabled={!apiKeyConfigured}
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-5 h-5 accent-fuchsia-500" />
                <div>
                  <div className="font-bold text-sm">Activer le Mode Vidéo</div>
                  <div className="text-[11px] text-zinc-500">Le bouton « 🎬 Vidéo » apparaîtra dans le chat</div>
                </div>
              </label>
            </div>
          </div>

          {/* CARTE MODE LIVE LOCAL */}
          <div className={`rounded-2xl border-2 overflow-hidden transition
            ${config.localLiveEnabled
              ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/10'
              : 'border-zinc-800 bg-zinc-900/50'}`}>
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white">
              <div className="flex items-start justify-between mb-2">
                <span className="text-3xl">🎙</span>
                <span className="bg-white/20 backdrop-blur text-[10px] font-bold uppercase px-2 py-1 rounded-full">
                  Gratuit · Live
                </span>
              </div>
              <h3 className="text-xl font-bold">Mode Live local</h3>
              <p className="text-sm opacity-90 mt-1">Conversation vocale temps réel avec un avatar SVG animé</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-zinc-300">Conversation fluide, le visiteur PARLE</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-zinc-300">Réponse immédiate, pas d'attente vidéo</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-zinc-300">Quasi-gratuit (10 000 chars/mois ElevenLabs)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">−</span>
                  <span className="text-zinc-400">Avatar SVG stylisé (pas photo-réaliste)</span>
                </div>
              </div>

              <div className="bg-zinc-950 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-zinc-500">Statut clé ElevenLabs</span>
                  {hasElevenLabs
                    ? <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={11} /> Configurée</span>
                    : <span className="text-red-300 flex items-center gap-1"><AlertCircle size={11} /> Manquante</span>}
                </div>
                {!hasElevenLabs && (
                  <div className="space-y-1 mt-2">
                    <a href="https://elevenlabs.io/app/sign-up" target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline text-[11px] flex items-center gap-1">
                      1️⃣ Créer un compte gratuit sur elevenlabs.io
                    </a>
                    <a href="/admin/settings" className="text-emerald-300 hover:underline text-[11px] flex items-center gap-1">
                      2️⃣ Coller la clé dans Paramètres → IA & Outils → ElevenLabs
                    </a>
                  </div>
                )}
              </div>

              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${config.localLiveEnabled ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-zinc-800/50 border-zinc-700'} ${!hasElevenLabs ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input type="checkbox"
                  disabled={!hasElevenLabs}
                  checked={config.localLiveEnabled}
                  onChange={(e) => setConfig({ ...config, localLiveEnabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500" />
                <div>
                  <div className="font-bold text-sm">Activer le Mode Live local</div>
                  <div className="text-[11px] text-zinc-500">Le bouton « 🎙 Live » apparaîtra dans le chat (plafond 2 min)</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* BOUTON SAUVEGARDE FLOTTANT haut */}
        <div className="mt-4 flex items-center justify-end gap-3 bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-xl p-3">
          {savedCfg && (
            <span className="text-emerald-300 text-sm flex items-center gap-1">
              <CheckCircle2 size={14} /> Sauvegardé !
            </span>
          )}
          <button
            onClick={saveConfig}
            disabled={savingCfg}
            className="bg-brand-pink hover:bg-pink-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2"
          >
            {savingCfg ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Sauvegarder mes choix
          </button>
        </div>
      </section>

      {/* WARN si pas de clé HeyGen (déjà visible dans la carte mais on le garde pour visibilité) */}
      {!apiKeyConfigured && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-amber-200 mb-1">Clé API HeyGen manquante</p>
            <p className="text-xs text-amber-300/80 mb-3">
              Pour utiliser l'avatar vidéo, crée un compte gratuit sur <a href="https://www.heygen.com" target="_blank" rel="noopener noreferrer" className="underline">heygen.com</a>,
              puis va dans Settings → API → Generate token. Colle-la dans Paramètres → IA & Outils → HeyGen.
            </p>
            <a href="/admin/settings" className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
              <KeyRound size={12} /> Configurer la clé
            </a>
          </div>
        </div>
      )}

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="État widget" value={config.enabled ? 'En ligne' : 'Hors ligne'} sub={config.enabled ? 'visible côté visiteur' : 'invisible'} gradient={config.enabled ? 'from-emerald-500 to-green-600' : 'from-zinc-500 to-zinc-700'} Icon={config.enabled ? Power : PowerOff} />
        <StatCard label="Avatars dispo" value={avatars.length} sub="dans ta bibliothèque HeyGen" gradient="from-violet-500 to-purple-600" Icon={Video} />
        <StatCard label="Voix françaises" value={voices.length} sub="en français" gradient="from-pink-500 to-rose-500" Icon={Volume2} />
        <StatCard label="Crédits restants" value={quota ?? '—'} sub={quota === null ? 'inconnu' : 'sur ton compte'} gradient="from-amber-500 to-orange-500" Icon={Sparkles} />
      </section>

      <div className="grid lg:grid-cols-[1fr_420px] gap-6">
        {/* COLONNE GAUCHE — config */}
        <div className="space-y-6">
          {/* AVATARS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold flex items-center gap-2"><Video size={16} className="text-fuchsia-400" /> Choix de l'avatar</h3>
                <p className="text-xs text-zinc-500">Le visage qui parlera aux visiteurs.</p>
              </div>
              <button onClick={loadAvatars} disabled={loadingList || !apiKeyConfigured} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 disabled:opacity-50">
                {loadingList ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Recharger
              </button>
            </div>

            {listError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-xs mb-3 flex items-center gap-2">
                <AlertCircle size={14} /> {listError}
              </div>
            )}

            {avatars.length === 0 && !loadingList && !listError && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {apiKeyConfigured ? 'Aucun avatar trouvé. Connecte-toi à heygen.com pour en créer.' : 'Renseigne d\'abord ta clé API.'}
              </div>
            )}

            {loadingList && (
              <div className="text-center py-8 text-zinc-500 text-sm flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Chargement de la galerie HeyGen…
              </div>
            )}

            {avatars.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {avatars.slice(0, 24).map((a) => {
                  const active = config.avatarId === a.avatar_id;
                  return (
                    <button
                      key={a.avatar_id}
                      onClick={() => setConfig({ ...config, avatarId: a.avatar_id })}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 border-2 transition
                        ${active ? 'border-brand-pink scale-[1.02] shadow-lg shadow-brand-pink/30' : 'border-zinc-800 hover:border-zinc-700'}`}
                    >
                      {a.preview_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.preview_image_url} alt={a.avatar_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Video size={24} />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-white text-[11px] font-bold truncate">{a.avatar_name}</div>
                      </div>
                      {active && (
                        <div className="absolute top-2 right-2 bg-brand-pink rounded-full p-1">
                          <CheckCircle2 size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* VOIX */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="font-bold flex items-center gap-2 mb-1"><Volume2 size={16} className="text-pink-400" /> Voix française</h3>
            <p className="text-xs text-zinc-500 mb-3">Tonalité, accent et naturel de la diction.</p>
            {voices.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Aucune voix française détectée.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {voices.slice(0, 18).map((v) => {
                  const active = config.voiceId === v.voice_id;
                  return (
                    <div key={v.voice_id} className={`rounded-xl border p-3 transition cursor-pointer
                      ${active ? 'bg-brand-pink/10 border-brand-pink/50' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                      onClick={() => setConfig({ ...config, voiceId: v.voice_id })}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="font-bold text-sm truncate">{v.name}</div>
                        {active && <CheckCircle2 size={12} className="text-brand-pink shrink-0" />}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase">
                        {v.gender || '—'} · {v.language}
                      </div>
                      {v.preview_audio && (
                        <audio controls className="w-full mt-2 h-7" preload="none">
                          <source src={v.preview_audio} />
                        </audio>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* RÉGLAGES */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold">Réglages</h3>

            <div>
              <div className="text-xs font-bold uppercase text-zinc-400 mb-2">Couleur de fond</div>
              <div className="flex flex-wrap gap-2">
                {BG_PRESETS.map((bg) => (
                  <button key={bg.color}
                    onClick={() => setConfig({ ...config, bgColor: bg.color })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition
                      ${config.bgColor === bg.color ? 'border-brand-pink bg-brand-pink/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    <span className="w-4 h-4 rounded border border-zinc-700" style={{ background: bg.color }} />
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase text-zinc-400">Plafond par visiteur / jour</span>
              <input type="number" min={1} max={20}
                value={config.dailyCap}
                onChange={(e) => setConfig({ ...config, dailyCap: parseInt(e.target.value) || 3 })}
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink" />
              <span className="text-[11px] text-zinc-500 mt-1 block">Évite les abus et l'explosion du budget HeyGen.</span>
            </label>

            {/* MODE LIVE LOCAL (gratuit, ElevenLabs + Web Speech + avatar SVG) */}
            <div className="bg-emerald-500/5 border-2 border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded">Gratuit</span>
                <h4 className="font-bold text-sm">🎙 Mode Live local (conversation vocale)</h4>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                L'avatar SVG t'écoute (Web Speech navigateur), réfléchit (RAG Gemini) et répond avec une voix ElevenLabs.
                Bouche animée sur l'amplitude audio. <strong className="text-emerald-300">Aucune dépendance HeyGen.</strong>
                <br />Coût : ElevenLabs free tier = 10 000 caractères/mois (≈ 200 réponses moyennes).
              </p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={config.localLiveEnabled}
                  onChange={(e) => setConfig({ ...config, localLiveEnabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-500" />
                <div>
                  <div className="font-bold text-sm">Activer le mode Live local côté visiteur</div>
                  <div className="text-[11px] text-zinc-500">Le bouton « 🎙 Live » apparaîtra dans le chat. Sessions plafonnées à 2 min. Nécessite clé ElevenLabs configurée.</div>
                </div>
              </label>
            </div>

            {/* MODE LIVE STREAMING HEYGEN (DÉPRÉCIÉ — endpoint sunset) */}
            <div className="bg-amber-500/5 border-2 border-amber-500/30 rounded-xl p-4 space-y-3 opacity-60">
              <div className="flex items-center gap-2">
                <span className="bg-amber-500 text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded">Sunset</span>
                <h4 className="font-bold text-sm">🛑 Mode Live HeyGen Streaming (déprécié)</h4>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                HeyGen a sunset l'endpoint <code className="bg-zinc-800 px-1">/v1/streaming.new</code> le 3 mai 2026 et l'a séparé en un produit distinct sur <a href="https://liveavatar.com" target="_blank" rel="noopener noreferrer" className="text-amber-300 hover:underline">liveavatar.com</a>.
                Pour réactiver le streaming, créer un compte LiveAvatar séparé et nous donner la clé.
              </p>

              <label className="block">
                <span className="text-[11px] font-bold uppercase text-zinc-400">ID Avatar Streaming-compatible</span>
                <input
                  value={config.streamingAvatarName}
                  onChange={(e) => setConfig({ ...config, streamingAvatarName: e.target.value })}
                  placeholder="Susan_public_2_20240328"
                  className="mt-1 w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-fuchsia-500"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Recommandés : <code className="bg-zinc-800 px-1">Susan_public_2_20240328</code> (mature, calme),
                  <code className="bg-zinc-800 px-1 ml-1">Anna_public_3_20240108</code> (jeune, dynamique).
                  Pour utiliser TON visage : crée un Custom Avatar Streaming sur <a href="https://app.heygen.com/avatars" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:underline">app.heygen.com/avatars</a> puis colle son ID ici.
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox"
                  checked={config.streamingEnabled}
                  onChange={(e) => setConfig({ ...config, streamingEnabled: e.target.checked })}
                  className="w-5 h-5 accent-fuchsia-500" />
                <div>
                  <div className="font-bold text-sm">Activer le mode Live côté visiteur</div>
                  <div className="text-[11px] text-zinc-500">Le bouton « 🎙 Live » apparaîtra dans le chat. Sessions plafonnées à 2 min.</div>
                </div>
              </label>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-5 h-5 accent-brand-pink" />
              <div>
                <div className="font-bold text-sm">Activer le widget « GLD Live » côté visiteur</div>
                <div className="text-xs text-zinc-500">Le bouton avatar apparaîtra à côté du chat texte.</div>
              </div>
            </label>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              {savedCfg && <span className="text-emerald-400 text-sm flex items-center gap-1 mr-3"><CheckCircle2 size={14} /> Enregistré</span>}
              <button onClick={saveConfig} disabled={savingCfg || !config.avatarId || !config.voiceId}
                className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
                {savingCfg ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Sauvegarder la configuration
              </button>
            </div>
          </section>
        </div>

        {/* COLONNE DROITE — preview + test */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* PREVIEW */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Eye size={14} /> Aperçu</h3>
            <div className="aspect-[3/4] rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: config.bgColor }}>
              {currentAvatar?.preview_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentAvatar.preview_image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-zinc-500 text-xs text-center p-4">
                  Choisis un avatar dans la galerie ↖
                </div>
              )}
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Avatar</span>
                <span className="text-white font-semibold truncate ml-2">{currentAvatar?.avatar_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Voix</span>
                <span className="text-white font-semibold truncate ml-2">{currentVoice?.name || '—'}</span>
              </div>
            </div>
          </div>

          {/* TEST LIVE */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><Zap size={14} className="text-amber-400" /> Tester en live</h3>
            <p className="text-[11px] text-zinc-500 mb-3">Génère une vraie vidéo. Coût : ~1 crédit.</p>
            <input
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              placeholder="Ex: Que dit la Bible sur l'amour ?"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink mb-2"
              onKeyDown={(e) => e.key === 'Enter' && !testing && runTest()}
            />
            <button onClick={runTest} disabled={testing || !testQuestion.trim() || !config.avatarId || !config.voiceId || !config.enabled}
              className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-sm flex items-center justify-center gap-2">
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Lancer le test
            </button>
            {!config.enabled && <p className="text-[10px] text-amber-400 mt-2">⚠ Active le widget pour tester.</p>}

            {testVideo && (
              <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
                {testVideo.status === 'completed' && testVideo.url ? (
                  <video src={testVideo.url} controls autoPlay className="w-full rounded-lg bg-black" />
                ) : testVideo.status === 'failed' ? (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle size={14} /> Génération HeyGen refusée
                    </div>
                    {testVideo.errorMessage && (
                      <div className="bg-red-500/10 rounded p-2 text-[11px] break-words">
                        {testVideo.errorMessage}
                      </div>
                    )}
                    <div className="text-[10px] text-red-200/70 space-y-1">
                      <div className="font-bold uppercase">Causes probables :</div>
                      <div>• Plus de crédits sur ton compte HeyGen → vérifie sur <a href="https://app.heygen.com/billing" target="_blank" rel="noopener noreferrer" className="underline">app.heygen.com/billing</a></div>
                      <div>• L'avatar choisi n'est pas dans ton plan (essaie un autre)</div>
                      <div>• La voix n'est pas compatible avec cet avatar</div>
                      <div>• Le texte dépasse les limites HeyGen</div>
                    </div>
                  </div>
                ) : testVideo.status === 'timeout' ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg p-2 text-xs">
                    Timeout (>2 min) — HeyGen n'a pas fini. Réessaie ou regarde sur <a href="https://app.heygen.com/projects" target="_blank" rel="noopener noreferrer" className="underline">app.heygen.com/projects</a>.
                  </div>
                ) : (
                  <div className="bg-zinc-800 rounded-lg p-3 text-xs flex items-center gap-2 text-zinc-300">
                    <Loader2 size={14} className="animate-spin text-fuchsia-400" />
                    <div>
                      <div className="font-bold">HeyGen rend la vidéo…</div>
                      <div className="text-zinc-500 text-[10px]">Statut : {testVideo.status} · {'~'}30s en moyenne</div>
                    </div>
                  </div>
                )}
                {testVideo.answer && (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[11px] text-zinc-300 whitespace-pre-wrap">
                    {testVideo.answer}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, gradient, Icon }: { label: string; value: any; sub: string; gradient: string; Icon: LucideIcon }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-lg`}>
      <Icon size={20} className="opacity-90 mb-2" />
      <div className="text-2xl font-bold leading-none mb-1">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
      {sub && <div className="text-[10px] opacity-75 mt-1">{sub}</div>}
    </div>
  );
}
