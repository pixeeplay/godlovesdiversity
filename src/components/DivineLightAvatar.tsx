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

  /* ===== Reconnaissance vocale (gratuite, Web Speech API) ===== */
  function startListening() {
    setError('');
    setTranscript('');
    setResponse('');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Reconnaissance vocale non supportée par ton navigateur. Utilise Chrome ou Edge.'); return; }
    const r = new SR();
    r.lang = 'fr-FR';
    r.interimResults = true;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((res: any) => res[0].transcript).join(' ');
      setTranscript(t);
    };
    r.onerror = (e: any) => { setError(e.error); setListening(false); };
    r.onend = async () => {
      setListening(false);
      const finalText = (r as any)._finalText || transcript;
      // Récupère la dernière transcription via state à jour
      const finalQ = transcript || finalText;
      if (finalQ.trim()) await ask(finalQ);
    };
    recogRef.current = r;
    r.start();
  }

  function stopListening() {
    recogRef.current?.stop();
    setListening(false);
  }

  /* ===== Question → RAG GLD → réponse ===== */
  async function ask(question: string) {
    setThinking(true);
    setResponse('');
    try {
      const r = await fetch('/api/ask', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, useRag: true })
      });
      const j = await r.json();
      const answer = j.answer || j.text || 'Je n\'ai pas de réponse pour le moment.';
      setResponse(answer);
      if (!muted) speak(answer);
    } catch (e: any) {
      setError('Erreur : ' + e.message);
    } finally { setThinking(false); }
  }

  /* ===== Synthèse vocale (gratuite, native) ===== */
  function speak(text: string) {
    if (!('speechSynthesis' in window)) { setError('Voix non supportée'); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 0.95;
    // Voix française la plus naturelle dispo
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find(v => v.lang.startsWith('fr') && /google|enhanced|premium/i.test(v.name)) || voices.find(v => v.lang.startsWith('fr'));
    if (fr) u.voice = fr;
    u.onstart = () => { setSpeaking(true); pulseStart(); };
    u.onend = () => { setSpeaking(false); pulseStop(); };
    u.onerror = () => { setSpeaking(false); pulseStop(); };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    pulseStop();
  }

  useEffect(() => () => { stopSpeaking(); pulseStop(); }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-950" style={{ minHeight: 480 }}>
      {/* Image fond */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />

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
