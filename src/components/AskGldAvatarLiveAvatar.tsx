'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, X, Mic, MicOff, AlertCircle } from 'lucide-react';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track, createLocalAudioTrack } from 'livekit-client';

type Phase = 'idle' | 'starting' | 'connecting' | 'live' | 'ending' | 'error';

type Props = {
  onClose: () => void;
};

/**
 * Mode Live LiveAvatar — avatar streaming temps-réel via LiveKit.
 * Successeur de HeyGen Interactive (sunset 3 mai 2026).
 *
 * Flow :
 *  1. POST /api/avatar/liveavatar/start → token + livekit_url + livekit_client_token
 *  2. Connexion à la room LiveKit
 *  3. Subscribe aux tracks vidéo/audio de l'agent (l'avatar)
 *  4. Publish notre micro
 *  5. Keep-alive serveur toutes les 60 s
 *  6. Plafond auto basé sur max_session_duration
 */
export function AskGldAvatarLiveAvatar({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const localAudioRef = useRef<any>(null);
  const sessionRef = useRef<{ session_id: string; session_token: string } | null>(null);
  const keepAliveTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    void start();
    return () => { void cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setPhase('starting');
    setError(null);
    try {
      // 1. Démarre la session côté serveur
      const r = await fetch('/api/avatar/liveavatar/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Échec démarrage session');
      sessionRef.current = { session_id: j.session_id, session_token: j.session_token };

      const max = j.max_session_duration || 120;
      setSecondsLeft(max);

      // Compte à rebours
      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s === null) return null;
          if (s <= 1) {
            void cleanup();
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      // Keep-alive toutes les 60 s
      keepAliveTimerRef.current = setInterval(() => {
        if (!sessionRef.current) return;
        void fetch('/api/avatar/liveavatar/keep-alive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionRef.current)
        }).catch(() => null);
      }, 60_000);

      // 2. Connexion LiveKit
      setPhase('connecting');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Video && videoRef.current) {
          track.attach(videoRef.current);
        } else if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current);
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        setPhase('idle');
      });

      await room.connect(j.livekit_url, j.livekit_client_token);

      // 3. Publier notre micro
      // Pas d'options custom — les contraintes media boguent sur certains
      // navigateurs (Safari iOS notamment) et lèvent "Invalid constraint".
      // LiveKit applique ses propres défauts qui marchent partout.
      let localAudio;
      try {
        localAudio = await createLocalAudioTrack();
      } catch (audioErr: any) {
        // Fallback ultra-permissif si même les défauts plantent
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = stream.getAudioTracks()[0];
        await room.localParticipant.publishTrack(track);
        localAudioRef.current = { stop: () => track.stop(), mute: () => track.enabled = false, unmute: () => track.enabled = true };
        setPhase('live');
        return;
      }
      localAudioRef.current = localAudio;
      await room.localParticipant.publishTrack(localAudio);

      setPhase('live');
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
      setPhase('error');
    }
  }

  async function cleanup() {
    setPhase('ending');
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (keepAliveTimerRef.current) clearInterval(keepAliveTimerRef.current);
    countdownTimerRef.current = null;
    keepAliveTimerRef.current = null;

    try { localAudioRef.current?.stop(); } catch { /* noop */ }
    try { roomRef.current?.disconnect(); } catch { /* noop */ }
    roomRef.current = null;

    if (sessionRef.current) {
      try {
        await fetch('/api/avatar/liveavatar/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...sessionRef.current, reason: 'USER_END' })
        });
      } catch { /* noop */ }
      sessionRef.current = null;
    }
  }

  function toggleMute() {
    if (!localAudioRef.current) return;
    if (muted) {
      localAudioRef.current.unmute?.();
      setMuted(false);
    } else {
      localAudioRef.current.mute?.();
      setMuted(true);
    }
  }

  async function handleClose() {
    await cleanup();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-2xl aspect-[3/4] sm:aspect-video bg-zinc-950 rounded-2xl overflow-hidden border-2 border-fuchsia-500/40 shadow-[0_0_60px_rgba(217,70,239,0.4)]">
        {/* Vidéo de l'avatar */}
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover bg-zinc-900" />
        <audio ref={audioRef} autoPlay />

        {/* Overlay loading */}
        {(phase === 'idle' || phase === 'starting' || phase === 'connecting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-fuchsia-950/80 to-pink-950/80">
            <Loader2 size={36} className="text-fuchsia-300 animate-spin" />
            <div className="text-fuchsia-100 font-bold text-sm">
              {phase === 'starting' && 'Réservation de l\'avatar…'}
              {phase === 'connecting' && 'Connexion vidéo en cours…'}
              {phase === 'idle' && 'Initialisation…'}
            </div>
            <div className="text-fuchsia-200/70 text-xs">~10 secondes</div>
          </div>
        )}

        {/* Erreur */}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-950/90 p-6 text-center">
            <AlertCircle size={36} className="text-red-300" />
            <div className="text-red-100 font-bold">Connexion échouée</div>
            <div className="text-red-200/80 text-xs max-w-md whitespace-pre-wrap">{error}</div>

            {/* Aide contextuelle pour les erreurs courantes */}
            {error && /concurrency limit/i.test(error) && (
              <div className="text-amber-200/80 text-[11px] max-w-md bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-1">
                <strong>Free tier LiveAvatar = 1 session simultanée max.</strong><br />
                Une session précédente est encore active. Attends qu'elle expire (max 2 min) ou retente — on essaie de la fermer automatiquement.
              </div>
            )}
            {error && /Invalid constraint|getUserMedia/i.test(error) && (
              <div className="text-amber-200/80 text-[11px] max-w-md bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-1">
                Le navigateur a refusé l'accès au micro. Vérifie que tu as autorisé le micro (icône cadenas dans la barre d'adresse).
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setError(null); void start(); }}
                className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-full text-xs"
              >
                Réessayer
              </button>
              <button
                onClick={handleClose}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-full text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Header avec timer */}
        {phase === 'live' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="bg-black/60 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              EN DIRECT · {secondsLeft != null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '—'}
            </div>
            <button
              onClick={handleClose}
              className="bg-black/60 backdrop-blur hover:bg-black/80 text-white p-2 rounded-full"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Contrôles */}
        {phase === 'live' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition ${muted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur'} text-white`}
              aria-label={muted ? 'Activer micro' : 'Couper micro'}
            >
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button
              onClick={handleClose}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-5 py-3 rounded-full text-sm flex items-center gap-2"
            >
              <X size={16} /> Terminer
            </button>
          </div>
        )}
      </div>

      <p className="text-fuchsia-200/60 text-xs mt-4 max-w-md text-center">
        Avatar temps-réel propulsé par LiveAvatar · Tu parles, l'avatar t'écoute et te répond instantanément
      </p>
    </div>
  );
}
