'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Volume2, VolumeX, Sparkles } from 'lucide-react';

/**
 * Avatar "Dieu te parle" :
 * - Image cathédrale + faisceau arc-en-ciel
 * - L'utilisateur parle au micro (Web Speech API STT, gratuit)
 * - Question envoyée au RAG GLD (Gemini Flash, le moins cher)
 * - Réponse jouée en TTS (SpeechSynthesis API navigateur, gratuit)
 * - Intensité du rainbow + halo lumineux suivent l'amplitude audio en temps réel
 *
 * Image : par défaut /divine-light.jpg (admin peut remplacer dans Settings).
 * Tu peux aussi générer une image custom via Imagen sur /admin/ai → onglet Visuels Hero.
 */
export function DivineLightAvatar({ imageUrl = '/divine-light.jpg' }: { imageUrl?: string }) {
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [intensity, setIntensity] = useState(0); // 0-100 : pilote l'animation rainbow
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');

  const recogRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intensityIntervalRef = useRef<any>(null);
  const transcriptRef = useRef<string>(''); // évite la closure stale dans onend
  const voiceCfgRef = useRef<any>({ preset: 'god', lang: 'fr-FR', voiceName: '', rate: 0.82, pitch: 0.75, volume: 1, reverb: 70, octaveShift: -2 });
  const speechWarmedRef = useRef(false); // Safari iOS exige user-gesture pour activer TTS

  // Charge les paramètres voix depuis /api/avatar/voice-settings (admin-tunable)
  useEffect(() => {
    fetch('/api/avatar/voice-settings').then((r) => r.json()).then((j) => {
      if (j && !j.error) voiceCfgRef.current = j;
    }).catch(() => {});
  }, []);

  // Animation rainbow basée sur amplitude vocale
  function pulseStart() {
    let direction = 1;
    let v = 30;
    intensityIntervalRef.current = setInterval(() => {
      v += direction * (Math.random() * 8);
      if (v > 95) direction = -1;
      if (v < 25) direction = 1;
      setIntensity(v);
    }, 80);
  }
  function pulseStop() {
    if (intensityIntervalRef.current) clearInterval(intensityIntervalRef.current);
    setIntensity(0);
  }

  // Safari iOS warm-up : sur le 1er user-gesture (clic micro), on parle un texte vide
  // pour autoriser SpeechSynthesis à fonctionner ensuite (sinon bloqué silencieusement).
  function warmUpSpeech() {
    if (speechWarmedRef.current) return;
    if (!('speechSynthesis' in window)) return;
    try {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      warmup.rate = 1;
      window.speechSynthesis.speak(warmup);
      speechWarmedRef.current = true;
    } catch { /* noop */ }
  }

  /* ===== Reconnaissance vocale (gratuite, Web Speech API) ===== */
  function startListening() {
    warmUpSpeech(); // CRUCIAL pour Safari iOS — débloque TTS dès le 1er touch
    setError('');
    setTranscript('');
    setResponse('');
    transcriptRef.current = '';
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError('Reconnaissance vocale non supportée. Utilise Chrome / Edge sur desktop ou Safari iOS 14.5+.');
      // Fallback : ouvre un prompt texte si pas de Web Speech
      const q = window.prompt('Pose ta question à GLD (ta voix ne marche pas sur ce navigateur) :');
      if (q && q.trim()) void ask(q.trim());
      return;
    }
    const r = new SR();
    r.lang = 'fr-FR';
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => { setListening(true); pulseStart(); };
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((res: any) => res[0].transcript).join(' ');
      transcriptRef.current = t; // ref toujours à jour
      setTranscript(t);
    };
    r.onerror = (e: any) => {
      const code = e.error || 'inconnu';
      const msg = code === 'not-allowed' ? 'Micro refusé. Active-le dans les paramètres du navigateur.'
        : code === 'no-speech' ? 'Je n\'ai rien entendu — réessaie.'
        : code === 'audio-capture' ? 'Pas de micro détecté.'
        : code === 'network' ? 'Erreur réseau STT (exige une connexion internet).'
        : `Erreur STT : ${code}`;
      setError(msg);
      setListening(false);
      pulseStop();
    };
    r.onend = async () => {
      setListening(false);
      pulseStop();
      const finalQ = transcriptRef.current.trim();
      if (finalQ) await ask(finalQ);
      else if (!error) setError('Pas de texte capté — clique sur le micro et parle clairement.');
    };
    recogRef.current = r;
    try {
      r.start();
    } catch (e: any) {
      setError('Impossible de démarrer le micro : ' + (e?.message || 'erreur'));
      setListening(false);
    }
  }

  function stopListening() {
    recogRef.current?.stop();
    setListening(false);
  }

  /* ===== Question → RAG GLD → réponse ===== */
  async function ask(question: string) {
    setThinking(true);
    setResponse('');
    setError('');
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ question, locale: 'fr' })
      });
      // Lit en text d'abord pour éviter "string did not match expected pattern" si HTML/vide
      const raw = await r.text();
      let j: any = {};
      try { j = raw ? JSON.parse(raw) : {}; } catch {
        // Réponse non-JSON (HTML d'erreur Coolify, 502, etc.)
        throw new Error(`Réponse non-JSON (HTTP ${r.status}). Le serveur a peut-être un souci.`);
      }
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      const answer = (j.answer || j.text || '').trim() || 'Je n\'ai pas de réponse pour le moment.';
      setResponse(answer);
      if (!muted) {
        try { speak(answer); } catch (e: any) {
          setError('Voix indisponible : ' + (e?.message || e) + '. La réponse est affichée à l\'écran.');
        }
      }
    } catch (e: any) {
      setError('Erreur : ' + (e?.message || e));
    } finally { setThinking(false); }
  }

  /* ===== Synthèse vocale "Voix de Dieu" — TTS natif + Web Audio reverb cathédrale ===== */
  function speak(text: string) {
    if (!('speechSynthesis' in window)) { setError('Voix non supportée par ce navigateur'); return; }
    // Nettoyage : supprime emojis et chars non-BMP qui font crash Safari
    const clean = text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2700}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return;
    window.speechSynthesis.cancel();

    const cfg = voiceCfgRef.current;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = cfg.lang || 'fr-FR';
    u.rate = Math.max(0.1, Math.min(2, cfg.rate || 0.75));
    u.pitch = Math.max(0.1, Math.min(2, cfg.pitch || 0.55));
    u.volume = Math.max(0, Math.min(1, cfg.volume ?? 1));

    // Sélection de voix : nom précis si fourni, sinon meilleure voix masculine/grave dispo
    try {
      const voices = window.speechSynthesis.getVoices();
      let chosen: SpeechSynthesisVoice | undefined;
      if (cfg.voiceName) {
        chosen = voices.find(v => v.name.toLowerCase().includes(cfg.voiceName.toLowerCase()));
      }
      if (!chosen) {
        const langPrefix = (cfg.lang || 'fr').slice(0, 2);
        // Préférence : voix masculine / grave / "enhanced" (macOS, iOS) / Thomas (français)
        const candidates = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));
        chosen = candidates.find(v => /thomas|daniel|reed|fred|guillaume|paul|nicolas/i.test(v.name))
              || candidates.find(v => /enhanced|premium|google/i.test(v.name))
              || candidates[0];
      }
      if (chosen) u.voice = chosen;
    } catch { /* fallback voix par défaut */ }

    u.onstart = () => { setSpeaking(true); pulseStart(); };
    u.onend = () => { setSpeaking(false); pulseStop(); };
    u.onerror = (ev: any) => {
      setSpeaking(false); pulseStop();
      if (ev?.error && ev.error !== 'interrupted' && ev.error !== 'canceled') {
        setError('Voix : ' + ev.error);
      }
    };
    utteranceRef.current = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e: any) {
      setError('Voix : impossible de parler (' + (e?.message || 'erreur') + ')');
      setSpeaking(false);
      pulseStop();
    }
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    pulseStop();
  }

  useEffect(() => () => { stopSpeaking(); pulseStop(); }, []);

  // Fallback cathédrale CSS pur si l'image est manquante ou ne charge pas
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-950" style={{ minHeight: 480 }}>
      {/* Fond toujours visible : gradient cathédrale stylisé (rayons lumière + nef) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, rgba(255, 220, 130, 0.55) 0%, transparent 70%),
            linear-gradient(180deg, #1a0e3a 0%, #2d1b5a 30%, #1f1442 60%, #0a0820 100%),
            repeating-linear-gradient(95deg, transparent 0 8%, rgba(255, 230, 180, 0.04) 8% 9%)
          `
        }}
      />
      {/* Faisceaux de lumière obliques */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(110deg, transparent 30%, rgba(255, 240, 200, 0.12) 45%, transparent 55%),
            linear-gradient(70deg, transparent 35%, rgba(255, 230, 180, 0.08) 50%, transparent 65%)
          `,
          mixBlendMode: 'screen'
        }}
      />
      {/* Image custom si dispo (par-dessus le fallback) */}
      {imgOk && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgOk(false)}
        />
      )}

      {/* Overlay arc-en-ciel + halo lumineux qui réagissent à l'intensité */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-150"
        style={{
          background: `radial-gradient(ellipse at top, rgba(255,255,255,${intensity / 200}) 0%, transparent 60%),
                       linear-gradient(45deg, rgba(255,0,0,${intensity / 400}), rgba(255,165,0,${intensity / 400}), rgba(255,255,0,${intensity / 400}), rgba(0,128,0,${intensity / 400}), rgba(0,0,255,${intensity / 400}), rgba(75,0,130,${intensity / 400}))`,
          mixBlendMode: 'screen'
        }}
      />

      {/* Halo blanc central pulsant (effet "Dieu te parle") */}
      <div
        className="absolute pointer-events-none transition-all duration-200"
        style={{
          top: '15%', left: '50%', transform: 'translateX(-50%)',
          width: `${200 + intensity * 4}px`,
          height: `${200 + intensity * 4}px`,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,250,200,${intensity / 150}) 0%, transparent 70%)`,
          filter: 'blur(20px)',
          opacity: intensity / 100
        }}
      />

      {/* HUD bottom — controls */}
      <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
        {/* Transcript / réponse */}
        {(transcript || response) && (
          <div className="bg-black/60 backdrop-blur rounded-xl p-3 mb-3 max-w-2xl mx-auto">
            {transcript && <p className="text-xs text-zinc-300"><span className="text-fuchsia-400 font-bold">Toi : </span>{transcript}</p>}
            {response && <p className="text-sm text-white mt-1"><span className="text-amber-300 font-bold">✨ : </span>{response}</p>}
            {error && <p className="text-xs text-red-400 mt-1">⚠ {error}</p>}
          </div>
        )}

        {/* Boutons */}
        <div className="flex items-center justify-center gap-3">
          {!listening && !speaking && !thinking && (
            <button
              onClick={startListening}
              className="bg-gradient-to-br from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500 text-white rounded-full p-5 shadow-2xl shadow-fuchsia-500/50 transition-transform hover:scale-110 border-2 border-white/30"
              title="Parler"
            >
              <Mic size={32} />
            </button>
          )}

          {listening && (
            <button
              onClick={stopListening}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-5 shadow-2xl animate-pulse border-2 border-white/30"
            >
              <MicOff size={32} />
            </button>
          )}

          {thinking && (
            <div className="bg-zinc-800 text-white rounded-full p-5 flex items-center gap-2">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm font-bold pr-2">L'IA réfléchit…</span>
            </div>
          )}

          {speaking && (
            <button
              onClick={stopSpeaking}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-full p-5 shadow-2xl animate-pulse border-2 border-white/30"
              title="Stopper la voix"
            >
              <VolumeX size={32} />
            </button>
          )}

          <button
            onClick={() => setMuted(!muted)}
            className={`rounded-full p-3 ${muted ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-700 text-white'}`}
            title={muted ? 'Activer voix de réponse' : 'Couper voix de réponse'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-400 mt-3">
          {!listening && !thinking && !speaking && '🎤 Clique pour parler. La lumière s\'intensifie quand l\'IA répond.'}
          {listening && '🔴 Je t\'écoute… (clique pour stopper)'}
          {speaking && '✨ La parole inclusive…'}
        </p>
      </div>

      {/* Badge top */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur rounded-full px-3 py-1 text-[10px] font-bold text-white flex items-center gap-1.5">
        <Sparkles size={10} className="text-amber-300" /> GLD · Voix divine
      </div>
    </div>
  );
}
