'use client';
import { useEffect, useRef, useState } from 'react';
import { Siren, X, Volume2, VolumeX, Phone } from 'lucide-react';

/**
 * Mode alarme : sirène stridente Web Audio API + voix forte SpeechSynthesis.
 * Activé par appui long sur le bouton SOS.
 *
 * Objectif : faire fuir un agresseur OU attirer l'attention des passants.
 */
export function AlarmMode({ onClose }: { onClose: () => void }) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const speakIntervalRef = useRef<any>(null);
  const [muted, setMuted] = useState(false);

  // Démarre sirène + voix dès le mount
  useEffect(() => {
    startSiren();
    startVoice();
    // Empêche le sommeil de l'écran (utile en cas de besoin réel)
    let wakeLock: any = null;
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((w: any) => { wakeLock = w; }).catch(() => {});
    }
    // Vibration continue
    if ('vibrate' in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500, 200]);
      const v = setInterval(() => navigator.vibrate([500, 200, 500]), 1500);
      return () => {
        clearInterval(v);
        stop();
        wakeLock?.release?.();
      };
    }
    return () => { stop(); wakeLock?.release?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-stop si on mute/unmute
  useEffect(() => {
    if (muted) { stop(); }
    else { startSiren(); startVoice(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  function startSiren() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      // Sirène police : 2 oscillateurs qui alternent (haute / basse)
      const gain = ctx.createGain();
      gain.gain.value = 0.6; // Volume 60%
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      // Module la fréquence : 800 ↔ 1500 Hz toutes les 0.5s (effet sirène)
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4; // 4 Hz = 4 oscillations/seconde
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 350;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.connect(gain);
      osc.start();
      lfo.start();
      oscillatorsRef.current = [osc, lfo];
    } catch (e) {
      console.warn('[alarm] AudioContext failed', e);
    }
  }

  function startVoice() {
    try {
      const messages = [
        'AIDEZ-MOI ! APPELEZ LA POLICE ! AU SECOURS !',
        'HELP ME ! CALL THE POLICE ! EMERGENCY !',
        'AYUDA ! LLAMEN A LA POLICÍA !',
        'JE SUIS EN DANGER ! APPELEZ LE 112 !'
      ];
      let i = 0;
      function speak() {
        if (!('speechSynthesis' in window)) return;
        const u = new SpeechSynthesisUtterance(messages[i % messages.length]);
        u.volume = 1.0;
        u.rate = 1.05;
        u.pitch = 1.5;
        u.lang = i === 0 || i === 3 ? 'fr-FR' : i === 1 ? 'en-US' : 'es-ES';
        window.speechSynthesis.speak(u);
        i++;
      }
      speak();
      speakIntervalRef.current = setInterval(speak, 4000);
    } catch (e) {
      console.warn('[alarm] SpeechSynthesis failed', e);
    }
  }

  function stop() {
    oscillatorsRef.current.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
    oscillatorsRef.current = [];
    audioCtxRef.current?.close().catch(() => null);
    audioCtxRef.current = null;
    if (speakIntervalRef.current) clearInterval(speakIntervalRef.current);
    speakIntervalRef.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function handleClose() {
    stop();
    if ('vibrate' in navigator) navigator.vibrate(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] bg-red-600 flex flex-col items-center justify-center text-white animate-pulse-slow">
      {/* Flash rouge full screen */}
      <style>{`
        @keyframes alarmFlash {
          0%, 100% { background-color: #dc2626; }
          50% { background-color: #fef3c7; }
        }
        .alarm-flash { animation: alarmFlash 0.5s linear infinite; }
        .animate-pulse-slow { animation: alarmFlash 0.6s linear infinite; }
      `}</style>

      <div className="text-center px-6 alarm-flash absolute inset-0 flex flex-col items-center justify-center">
        <Siren size={120} className="mb-6 animate-bounce" />
        <h1 className="text-5xl sm:text-7xl font-black mb-4 tracking-tight">SOS</h1>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 max-w-2xl">ALARME ACTIVÉE</h2>
        <p className="text-base sm:text-lg max-w-xl text-white/90 mb-8">
          🔊 Sirène + voix d'alerte en cours · 📳 Vibration · 🌐 Multilingue
        </p>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handleClose}
            className="bg-white text-red-600 hover:bg-zinc-100 font-black px-8 py-4 rounded-full text-lg shadow-2xl flex items-center gap-2 transform hover:scale-105 transition"
          >
            <X size={24} /> ARRÊTER L'ALARME
          </button>

          <button
            onClick={() => setMuted(!muted)}
            className="bg-white/20 hover:bg-white/30 backdrop-blur text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2"
          >
            {muted ? <><Volume2 size={16} /> Réactiver son</> : <><VolumeX size={16} /> Couper son</>}
          </button>

          <a
            href="tel:112"
            className="bg-black/30 hover:bg-black/50 backdrop-blur text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2"
          >
            <Phone size={16} /> Appeler le 112
          </a>
        </div>

        <p className="text-[10px] text-white/70 mt-6 max-w-md">
          ⚠ Cette alarme est conçue pour faire fuir un agresseur ou alerter des témoins. Utilise-la seulement en danger réel.
        </p>
      </div>
    </div>
  );
}
