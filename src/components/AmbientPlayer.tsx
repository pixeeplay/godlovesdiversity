'use client';
import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

/**
 * Lecteur audio ambiant — désactivé par défaut, toggle utilisateur.
 * Charge la liste des morceaux depuis /api/settings/public?keys=audio.tracks
 * Format settings : `audio.tracks` = JSON `[{ "url":"...", "title":"..." }, ...]`
 * Persiste le choix on/off + volume dans localStorage.
 */
export function AmbientPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<{ url: string; title: string }[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [trackIdx, setTrackIdx] = useState(0);

  useEffect(() => {
    fetch('/api/settings/public?keys=audio.tracks,audio.enabled')
      .then((r) => r.json())
      .then((j) => {
        if (j['audio.tracks']) {
          try {
            const arr = JSON.parse(j['audio.tracks']);
            if (Array.isArray(arr) && arr.length > 0) setTracks(arr);
          } catch {}
        }
      })
      .catch(() => {});
    const savedEnabled = localStorage.getItem('gld_audio_enabled');
    if (savedEnabled === '1') setEnabled(true);
    const savedVol = localStorage.getItem('gld_audio_volume');
    if (savedVol) setVolume(Number(savedVol));
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('gld_audio_enabled', next ? '1' : '0');
    if (next && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    } else if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }

  function setVol(v: number) {
    setVolume(v);
    localStorage.setItem('gld_audio_volume', String(v));
  }

  function onEnded() {
    setTrackIdx((i) => (i + 1) % Math.max(1, tracks.length));
  }

  if (tracks.length === 0) return null; // Si pas de tracks configurés, rien à afficher

  const current = tracks[trackIdx % tracks.length];

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-full shadow-xl p-1.5 flex items-center gap-2">
      <button onClick={toggle} aria-label={enabled ? 'Couper la musique' : 'Activer la musique d\'ambiance'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${enabled ? 'bg-brand-pink text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      {enabled && (
        <>
          <Music size={12} className="text-white/40" />
          <span className="text-xs text-white/70 max-w-[140px] truncate hidden sm:inline">{current.title}</span>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={(e) => setVol(Number(e.target.value))}
            className="w-16 accent-brand-pink"
            aria-label="Volume"
          />
        </>
      )}
      <audio
        ref={audioRef}
        src={current.url}
        autoPlay={enabled}
        loop={tracks.length === 1}
        onEnded={onEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  );
}
