'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Loader2, Sparkles, AlertCircle, Phone, PhoneOff } from 'lucide-react';

/**
 * Modal plein écran pour la conversation streaming HeyGen Interactive Avatar.
 * - Capture micro via Web Speech API (gratuit, browser natif)
 * - Stream vidéo avatar via LiveKit
 * - Plafond 2 min auto-déconnexion
 */

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error';

const MAX_DURATION_SEC = 120; // 2 minutes plafond visiteur

export function AskGldAvatarLive({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');   // ce que dit le visiteur en cours
  const [lastAnswer, setLastAnswer] = useState<string>('');   // dernière réponse de GLD
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const sessionIdRef = useRef<string | null>(null);
  const livekitRoomRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Démarre la session HeyGen + LiveKit + Web Speech
  async function start() {
    setStatus('connecting');
    setErrorMsg('');

    try {
      // 1. Démarrer la session côté backend
      const r = await fetch('/api/avatar/streaming/start', { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (j.error === 'streaming_disabled') {
          throw new Error('Mode Live désactivé par l\'admin.');
        }
        throw new Error(j.error || 'Erreur démarrage session');
      }
      sessionIdRef.current = j.session_id;

      // 2. Charger LiveKit dynamiquement (évite SSR)
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      livekitRoomRef.current = room;

      // Quand l'avatar attache son flux vidéo
      room.on(RoomEvent.TrackSubscribed, (track: any) => {
        if (track.kind === Track.Kind.Video && videoElRef.current) {
          track.attach(videoElRef.current);
        } else if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
      });

      await room.connect(j.url, j.access_token);
      setStatus('connected');

      // Démarre le timer
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSec(sec);
        if (sec >= MAX_DURATION_SEC) {
          stop('Limite de 2 minutes atteinte');
        }
      }, 1000);

      // 3. Démarrer Web Speech API
      startSpeechRecognition();
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erreur connexion');
      setStatus('error');
    }
  }

  function startSpeechRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Ton navigateur ne supporte pas la dictée vocale. Utilise Chrome ou Safari récent.');
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
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      setTranscript(finalText + interim);
      setStatus('listening');

      // Détection fin de phrase : 1.5s sans rien dire après un texte final → on envoie
      if (silenceTimer) clearTimeout(silenceTimer);
      if (finalText.trim()) {
        silenceTimer = setTimeout(() => {
          const toSend = finalText.trim();
          finalText = '';
          setTranscript('');
          if (toSend) sendToAvatar(toSend);
        }, 1500);
      }
    };

    rec.onerror = (e: any) => {
      console.warn('SpeechRecognition error', e?.error);
      // No-op : silence ou erreur réseau, on continue
    };

    rec.onend = () => {
      // Restart auto si la session est toujours active
      if (sessionIdRef.current && status !== 'ended') {
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

  async function sendToAvatar(text: string) {
    if (!sessionIdRef.current) return;
    setStatus('thinking');
    try {
      const r = await fetch('/api/avatar/streaming/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current, question: text, locale: 'fr' })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      setLastAnswer(j.answer || '');
      setStatus('speaking');
      // Retour à listening après ~quelques secondes (la réponse joue)
      setTimeout(() => setStatus('listening'), 2000);
    } catch (e: any) {
      console.warn('sendToAvatar error', e?.message);
      setStatus('listening');
    }
  }

  async function stop(reason?: string) {
    if (status === 'ended') return;
    setStatus('ended');
    if (reason) setErrorMsg(reason);

    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (livekitRoomRef.current) {
      try { await livekitRoomRef.current.disconnect(); } catch {}
    }
    if (sessionIdRef.current) {
      try {
        await fetch('/api/avatar/streaming/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionIdRef.current })
        });
      } catch {}
      sessionIdRef.current = null;
    }
  }

  // Cleanup à l'unmount
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
              <div className="font-bold text-sm">GLD Live — Conversation</div>
              <div className="text-[10px] opacity-90">
                {status === 'idle' && 'Prêt à converser'}
                {status === 'connecting' && 'Connexion à l\'avatar…'}
                {status === 'connected' && 'Avatar connecté'}
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

        {/* Vidéo avatar */}
        <div className="aspect-[3/4] bg-zinc-950 relative flex items-center justify-center">
          <video
            ref={videoElRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            style={{ display: status === 'connected' || status === 'listening' || status === 'thinking' || status === 'speaking' ? 'block' : 'none' }}
          />

          {status === 'idle' && (
            <div className="text-center px-6">
              <div className="text-5xl mb-3">🎙</div>
              <p className="text-sm font-bold mb-2">Conversation vocale en direct</p>
              <p className="text-xs text-zinc-400 mb-4">
                Tu vas pouvoir <strong>parler</strong> à l'avatar de GLD comme dans une visio. Il t'écoute et te répond en temps réel.
              </p>
              <p className="text-[11px] text-zinc-500 mb-4">
                Limite : 2 minutes par session. Ton micro sera activé.
              </p>
              <button
                onClick={start}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:opacity-90 text-white font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 mx-auto"
              >
                <Phone size={16} /> Démarrer la conversation
              </button>
            </div>
          )}

          {status === 'connecting' && (
            <div className="text-center px-6">
              <Loader2 size={32} className="text-fuchsia-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold">Connexion à l'avatar…</p>
              <p className="text-xs text-zinc-500 mt-1">~5 secondes</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center px-6">
              <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-red-300">Connexion impossible</p>
              <p className="text-xs text-zinc-400 mt-2 break-words">{errorMsg}</p>
              <button
                onClick={() => { setStatus('idle'); setErrorMsg(''); }}
                className="mt-4 text-xs text-fuchsia-400 hover:underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {status === 'ended' && (
            <div className="text-center px-6">
              <PhoneOff size={32} className="text-zinc-400 mx-auto mb-3" />
              <p className="text-sm font-bold">Conversation terminée</p>
              {errorMsg && <p className="text-xs text-zinc-500 mt-1">{errorMsg}</p>}
              <button
                onClick={onClose}
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-full text-xs"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Indicateur micro live */}
          {(status === 'listening' || status === 'connected') && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              <Mic size={12} className="text-emerald-400 animate-pulse" />
              <span className="text-white">{transcript || 'Parle…'}</span>
            </div>
          )}

          {status === 'thinking' && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-full px-3 py-1.5 flex items-center gap-2 text-xs">
              <Loader2 size={12} className="text-fuchsia-400 animate-spin" />
              <span className="text-white">GLD réfléchit…</span>
            </div>
          )}
        </div>

        {/* Dernière réponse en transcript */}
        {lastAnswer && (status === 'speaking' || status === 'listening') && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-3 max-h-24 overflow-y-auto">
            <p className="text-[11px] text-zinc-400">{lastAnswer}</p>
          </div>
        )}

        {/* Bouton stop bien visible pendant la session */}
        {(status === 'connected' || status === 'listening' || status === 'thinking' || status === 'speaking') && (
          <div className="bg-zinc-950 border-t border-zinc-800 p-3 flex justify-center">
            <button
              onClick={() => { stop('Conversation arrêtée'); }}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2"
            >
              <PhoneOff size={14} /> Mettre fin à la conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
