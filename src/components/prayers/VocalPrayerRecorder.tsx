'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, AlertTriangle, CheckCircle2, X, Trash2 } from 'lucide-react';

const MAX_DURATION_SEC = 180; // 3 min — doit matcher l'API

type Stage = 'idle' | 'recording' | 'review' | 'uploading' | 'done' | 'error';

interface Props {
  onUploaded?: (prayer: any) => void;
}

/**
 * Enregistreur audio Web (MediaRecorder API).
 *
 * Compat :
 *  - Chrome/Edge/Firefox : audio/webm;codecs=opus (natif)
 *  - Safari iOS / macOS  : audio/mp4 (mp4a) — détecté via isTypeSupported
 *  - Limite à 3 min côté client (timer auto-stop)
 */
export function VocalPrayerRecorder({ onUploaded }: Props) {
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string>('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioMime, setAudioMime] = useState<string>('audio/webm');
  const [isPublic, setIsPublic] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickMime(): string {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/mpeg'
    ];
    for (const m of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(m)) return m;
      } catch {}
    }
    return 'audio/webm';
  }

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Ton navigateur ne supporte pas l\'enregistrement audio.');
      setStage('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMime();
      const baseMime = mime.split(';')[0].trim();
      setAudioMime(baseMime);
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: baseMime });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setStage('review');
        // Stoppe le micro
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      recorder.onerror = (e: any) => {
        setError(e?.error?.message || 'Erreur d\'enregistrement.');
        setStage('error');
      };

      recorder.start(250);
      setStage('recording');
      setElapsedSec(0);

      // Timer
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const sec = Math.round((Date.now() - startedAt) / 1000);
        setElapsedSec(sec);
        if (sec >= MAX_DURATION_SEC) {
          stop();
        }
      }, 250);
    } catch (e: any) {
      setError(e?.message || 'Permission micro refusée.');
      setStage('error');
    }
  }

  function stop() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch {}
  }

  function resetAll() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl('');
    setElapsedSec(0);
    setError('');
    setStage('idle');
  }

  async function upload() {
    if (!audioBlob) return;
    setStage('uploading');
    setError('');

    try {
      const fd = new FormData();
      const ext = audioMime === 'audio/webm' ? 'webm'
        : audioMime === 'audio/mp4' ? 'm4a'
        : audioMime === 'audio/ogg' ? 'ogg'
        : audioMime === 'audio/mpeg' ? 'mp3' : 'webm';
      fd.append('audio', new File([audioBlob], `priere.${ext}`, { type: audioMime }));
      fd.append('durationSec', String(elapsedSec || 1));
      fd.append('language', 'fr');
      fd.append('isPublic', String(isPublic));

      const r = await fetch('/api/prayers/vocal', {
        method: 'POST',
        body: fd
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.message || j?.error || 'Erreur upload.');
        setStage('error');
        return;
      }
      setStage('done');
      onUploaded?.(j.prayer);
      // Reset après 1.5s pour pouvoir enchaîner
      setTimeout(() => resetAll(), 1500);
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau.');
      setStage('error');
    }
  }

  const mmss = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };
  const remaining = MAX_DURATION_SEC - elapsedSec;
  const progress = (elapsedSec / MAX_DURATION_SEC) * 100;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center shrink-0">
          <Mic size={22} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-lg">Enregistrer une prière vocale</h2>
          <p className="text-xs text-zinc-400">
            Parle librement, jusqu'à 3 minutes. L'IA transcrira automatiquement ton message en texte.
          </p>
        </div>
      </div>

      {/* Idle */}
      {stage === 'idle' && (
        <button
          onClick={start}
          className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
        >
          <Mic size={20} />
          Commencer l'enregistrement
        </button>
      )}

      {/* Recording */}
      {stage === 'recording' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="font-mono text-2xl tabular-nums">{mmss(elapsedSec)}</span>
            <span className="text-xs text-zinc-500">/ {mmss(MAX_DURATION_SEC)}</span>
            <span className="ml-auto text-[11px] text-zinc-400">
              {remaining > 30 ? 'Prends ton temps' : `Encore ${mmss(remaining)}`}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={stop}
            className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <Square size={18} fill="white" />
            Arrêter
          </button>
        </div>
      )}

      {/* Review */}
      {stage === 'review' && audioUrl && (
        <div className="space-y-3">
          <div className="bg-zinc-950 rounded-xl p-3">
            <p className="text-[11px] text-zinc-500 mb-1.5">Écoute ton enregistrement avant d'envoyer :</p>
            <audio src={audioUrl} controls className="w-full" />
            <p className="text-[10px] text-zinc-600 mt-1.5">Durée : {mmss(elapsedSec)}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="accent-fuchsia-500"
            />
            🌍 Partager anonymement dans le mur de prières publiques (texte uniquement, ton audio reste privé)
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={resetAll}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Recommencer
            </button>
            <button
              onClick={upload}
              className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} /> Envoyer
            </button>
          </div>
        </div>
      )}

      {/* Uploading */}
      {stage === 'uploading' && (
        <div className="text-center py-8">
          <Loader2 size={32} className="animate-spin text-fuchsia-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-300 font-bold">Envoi en cours…</p>
          <p className="text-xs text-zinc-500 mt-1">L'IA va ensuite transcrire ta prière.</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && (
        <div className="text-center py-8">
          <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
          <p className="font-bold text-emerald-300">Prière enregistrée ✨</p>
          <p className="text-xs text-zinc-500 mt-1">La transcription apparaîtra dans quelques secondes.</p>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-200 text-sm">Erreur</p>
              <p className="text-xs text-rose-300 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={resetAll}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <X size={14} /> Fermer
          </button>
        </div>
      )}
    </div>
  );
}
