'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, X, Loader2, Sparkles, AlertCircle, Phone, PhoneOff } from 'lucide-react';

/**
 * Mode Live local — alternative gratuite à HeyGen :
 *  - Avatar SVG (visage stylisé) avec bouche qui s'anime sur l'amplitude audio
 *  - Voix ElevenLabs (free tier 10 000 chars/mois)
 *  - STT Web Speech API (gratuit)
 *  - RAG Gemini (déjà configuré)
 *
 * Plafond 2 min auto-déconnexion.
 */

type Status = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error';

const MAX_DURATION_SEC = 120;

export function AskGldAvatarLocal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [lastAnswer, setLastAnswer] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [mouthOpenness, setMouthOpenness] = useState<number>(0); // 0-1, animation bouche

  const recognitionRef = useRef<any>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionActiveRef = useRef(false);

  function start() {
    setStatus('connecting');
    setErrorMsg('');
    sessionActiveRef.current = true;
    startTimeRef.current = Date.now();

    // Timer plafond
    timerRef.current = setInterval(() => {
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSec(sec);
      if (sec >= MAX_DURATION_SEC) stop('Limite de 2 minutes atteinte');
    }, 1000);

    startSpeechRecognition();
    setStatus('listening');
  }

  function startSpeechRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Ton navigateur ne supporte pas la dictée vocale. Utilise Chrome ou Safari.');
      setStatus('error');
      return;
    }
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = '';
    let silenceTimer: NodeJS.Timeout | null = null;

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setTranscript(finalText + interim);
      if (silenceTimer) clearTimeout(silenceTimer);
      if (finalText.trim()) {
        silenceTimer = setTimeout(() => {
          const toSend = finalText.trim();
          finalText = '';
          setTranscript('');
          if (toSend) processQuestion(toSend);
        }, 1500);
      }
    };

    rec.onerror = (e: any) => console.warn('SR error', e?.error);
    rec.onend = () => {
      if (sessionActiveRef.current) {
        try { rec.start(); } catch {}
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Impossible d\'activer la dictée');
      setStatus('error');
    }
  }

  async function processQuestion(text: string) {
    setStatus('thinking');
    try {
      const r = await fetch('/api/avatar/local-live/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, locale: 'fr' })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      setLastAnswer(j.answer || '');
      await playAudio(j.audioBase64, j.contentType);
    } catch (e: any) {
      console.warn(e);
      setStatus('listening');
    }
  }

  async function playAudio(audioBase64: string, contentType: string) {
    setStatus('speaking');
    // Décode base64 → Blob → URL
    const byteChars = atob(audioBase64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: contentType });
    const url = URL.createObjectURL(blob);

    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    const audio = audioElRef.current;
    audio.src = url;

    // Web Audio API pour analyser l'amplitude et animer la bouche
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    let source: MediaElementAudioSourceNode;
    try {
      source = ctx.createMediaElementSource(audio);
    } catch {
      // Si déjà connecté (réutilisation audio element), on saute
      source = null as any;
    }
    if (source) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      analyserRef.current = analyser;
    }

    const animate = () => {
      if (!analyserRef.current || audio.paused || audio.ended) {
        setMouthOpenness(0);
        return;
      }
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      // Moyenne basses fréquences (bouche)
      let sum = 0;
      for (let i = 0; i < 30; i++) sum += data[i];
      const avg = sum / 30 / 255;
      setMouthOpenness(Math.min(1, avg * 1.8));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    audio.onplay = () => {
      animate();
    };
    audio.onended = () => {
      setMouthOpenness(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      URL.revokeObjectURL(url);
      if (sessionActiveRef.current) setStatus('listening');
    };

    try {
      await audio.play();
    } catch (e: any) {
      console.warn('audio play failed', e?.message);
      setStatus('listening');
    }
  }

  async function stop(reason?: string) {
    if (status === 'ended') return;
    sessionActiveRef.current = false;
    setStatus('ended');
    if (reason) setErrorMsg(reason);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (audioElRef.current) {
      try { audioElRef.current.pause(); } catch {}
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }

  useEffect(() => () => { stop(); }, []);

  const remainingSec = Math.max(0, MAX_DURATION_SEC - elapsedSec);

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-fuchsia-500/40 rounded-2xl w-[480px] max-w-full overflow-hidden shadow-[0_0_50px_rgba(217,70,239,.5)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-fuchsia-500 to-pink-600 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <div>
              <div className="font-bold text-sm">GLD Live (gratuit)</div>
              <div className="text-[10px] opacity-90">
                {status === 'idle' && 'Prêt à converser'}
                {status === 'connecting' && 'Activation du micro…'}
                {status === 'listening' && '🎙 Je t\'écoute'}
                {status === 'thinking' && '💭 Je réfléchis…'}
                {status === 'speaking' && '🗨 Je parle…'}
                {status === 'ended' && 'Conversation terminée'}
                {status === 'error' && 'Erreur'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status !== 'idle' && status !== 'ended' && status !== 'error' && (
              <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded">
                {Math.floor(remainingSec / 60)}:{String(remainingSec % 60).padStart(2, '0')}
              </span>
            )}
            <button onClick={() => { stop(); onClose(); }} className="hover:opacity-70">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Avatar SVG */}
        <div className="aspect-[3/4] bg-gradient-to-br from-pink-50 via-violet-50 to-cyan-50 relative flex items-center justify-center">
          <AvatarFace
            mouthOpen={mouthOpenness}
            isListening={status === 'listening'}
            isThinking={status === 'thinking'}
            isSpeaking={status === 'speaking'}
          />

          {status === 'idle' && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-center p-6 text-white">
              <div className="text-5xl mb-3">🎙</div>
              <p className="text-sm font-bold mb-2">Conversation vocale gratuite</p>
              <p className="text-xs opacity-90 mb-4">
                100 % gratuit avec ta clé ElevenLabs (10 000 caractères/mois free).
                Tu parles, l'avatar t'écoute et te répond avec une voix naturelle.
              </p>
              <p className="text-[11px] opacity-75 mb-4">Limite : 2 minutes par session.</p>
              <button
                onClick={start}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:opacity-90 text-white font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2"
              >
                <Phone size={16} /> Démarrer la conversation
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 text-white">
              <AlertCircle size={32} className="text-red-400 mb-3" />
              <p className="text-sm font-bold text-red-300">Problème</p>
              <p className="text-xs mt-2 break-words">{errorMsg}</p>
              <button onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="mt-4 text-xs text-fuchsia-300 hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {status === 'ended' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center p-6 text-white">
              <PhoneOff size={32} className="text-zinc-400 mb-3" />
              <p className="text-sm font-bold">Conversation terminée</p>
              {errorMsg && <p className="text-xs opacity-80 mt-1">{errorMsg}</p>}
              <button onClick={onClose}
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs">
                Fermer
              </button>
            </div>
          )}

          {(status === 'listening' || status === 'thinking') && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              {status === 'listening' ? <>
                <Mic size={12} className="text-emerald-400 animate-pulse" />
                <span className="text-white">{transcript || 'Parle…'}</span>
              </> : <>
                <Loader2 size={12} className="text-fuchsia-400 animate-spin" />
                <span className="text-white">GLD réfléchit…</span>
              </>}
            </div>
          )}
        </div>

        {lastAnswer && (status === 'speaking' || status === 'listening') && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-3 max-h-24 overflow-y-auto">
            <p className="text-[11px] text-zinc-400">{lastAnswer}</p>
          </div>
        )}

        {(status === 'listening' || status === 'thinking' || status === 'speaking') && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-3 flex justify-center">
            <button onClick={() => stop('Conversation arrêtée')}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2">
              <PhoneOff size={14} /> Mettre fin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Avatar SVG ─────────────────────────────────────────── */

function AvatarFace({
  mouthOpen, isListening, isThinking, isSpeaking
}: {
  mouthOpen: number;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
}) {
  const mouthHeight = 8 + mouthOpen * 28;
  const mouthY = 200 - mouthHeight / 2;
  const blinkAnimation = isListening || isSpeaking ? 'animate-[blink_4s_ease-in-out_infinite]' : '';

  return (
    <svg viewBox="0 0 240 320" className="w-full h-full max-w-[300px]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="skinGrad" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#fce0d4" />
          <stop offset="100%" stopColor="#e5b69e" />
        </radialGradient>
        <radialGradient id="haloGrad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="rgba(217,70,239,0.4)" />
          <stop offset="100%" stopColor="rgba(217,70,239,0)" />
        </radialGradient>
        <style>{`
          @keyframes blink {
            0%, 96%, 100% { transform: scaleY(1); }
            98% { transform: scaleY(0.1); }
          }
          @keyframes pulseHalo {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.05); }
          }
        `}</style>
      </defs>

      {/* Halo arrière (anime quand parle) */}
      {isSpeaking && (
        <circle cx="120" cy="160" r="130" fill="url(#haloGrad)"
          style={{ animation: 'pulseHalo 1s ease-in-out infinite', transformOrigin: '120px 160px' }} />
      )}

      {/* Cou */}
      <rect x="100" y="240" width="40" height="50" fill="url(#skinGrad)" rx="8" />

      {/* Tête */}
      <ellipse cx="120" cy="150" rx="80" ry="95" fill="url(#skinGrad)" stroke="#a07556" strokeWidth="1" />

      {/* Cheveux */}
      <path d="M 50 130 Q 60 60 120 55 Q 180 60 190 130 Q 188 100 170 90 Q 145 70 120 75 Q 95 70 70 90 Q 52 100 50 130 Z"
        fill="#3a2418" />

      {/* Yeux */}
      <g style={{ transformOrigin: '95px 145px' }} className={blinkAnimation}>
        <ellipse cx="95" cy="145" rx="9" ry="11" fill="white" />
        <circle cx="95" cy="146" r="5" fill="#5a3825" />
        <circle cx="93" cy="144" r="2" fill="white" />
      </g>
      <g style={{ transformOrigin: '145px 145px' }} className={blinkAnimation}>
        <ellipse cx="145" cy="145" rx="9" ry="11" fill="white" />
        <circle cx="145" cy="146" r="5" fill="#5a3825" />
        <circle cx="143" cy="144" r="2" fill="white" />
      </g>

      {/* Sourcils */}
      <path d="M 80 125 Q 95 120 110 125" stroke="#3a2418" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 130 125 Q 145 120 160 125" stroke="#3a2418" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Nez */}
      <path d="M 120 155 Q 117 175 113 188 Q 115 192 120 192 Q 125 192 127 188 Q 123 175 120 155"
        fill="#d4a182" stroke="#a07556" strokeWidth="0.5" />

      {/* Bouche (s'anime selon mouthOpen) */}
      <ellipse cx="120" cy="200" rx="20" ry={mouthHeight / 2}
        fill="#7a2434" stroke="#5a1a25" strokeWidth="1" />
      {mouthOpen > 0.3 && (
        <rect x="105" y={mouthY + mouthHeight * 0.15} width="30" height="4" fill="white" rx="2" />
      )}

      {/* Indicateur thinking */}
      {isThinking && (
        <g>
          <circle cx="200" cy="80" r="6" fill="#d946ef" opacity="0.8">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx="215" cy="70" r="4" fill="#d946ef" opacity="0.6">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="225" cy="58" r="3" fill="#d946ef" opacity="0.4">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.6s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}
