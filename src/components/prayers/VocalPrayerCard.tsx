'use client';
import { useEffect, useState } from 'react';
import { Loader2, Trash2, AlertTriangle, Globe, Lock, Sparkles, Clock } from 'lucide-react';

export interface VocalPrayerData {
  id: string;
  audioUrl?: string;          // /api/prayers/vocal/:id/audio
  audioMime?: string;
  durationSec: number | null;
  language: string;
  transcription: string | null;
  title: string | null;
  mood: string | null;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string | null;
  isPublic: boolean;
  transcribedAt: string | Date | null;
  createdAt: string | Date;
}

interface Props {
  prayer: VocalPrayerData;
  onDelete?: (id: string) => void;
  onUpdated?: (prayer: VocalPrayerData) => void;
}

const MOOD_META: Record<string, { color: string; emoji: string }> = {
  joie:           { color: '#facc15', emoji: '☀️' },
  tristesse:      { color: '#60a5fa', emoji: '🌧️' },
  espoir:         { color: '#34d399', emoji: '🌱' },
  'colère':       { color: '#f87171', emoji: '🔥' },
  paix:           { color: '#a78bfa', emoji: '🕊️' },
  gratitude:      { color: '#fb923c', emoji: '🙏' },
  questionnement: { color: '#22d3ee', emoji: '❓' },
  'inquiétude':   { color: '#f472b6', emoji: '💭' }
};

export function VocalPrayerCard({ prayer: initial, onDelete, onUpdated }: Props) {
  const [prayer, setPrayer] = useState<VocalPrayerData>(initial);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // Polling pour passer de PROCESSING → COMPLETED/FAILED
  useEffect(() => {
    if (prayer.status !== 'PROCESSING') return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/prayers/vocal/${prayer.id}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        if (j?.prayer && j.prayer.status !== 'PROCESSING') {
          setPrayer(j.prayer);
          onUpdated?.(j.prayer);
          clearInterval(interval);
        }
      } catch {}
    }, 3000);

    // Timeout après 90s — on suppose un échec côté serveur
    const failTimeout = setTimeout(() => {
      if (!cancelled && prayer.status === 'PROCESSING') {
        setPrayer((p) => ({
          ...p,
          status: 'FAILED',
          errorMessage: 'Délai dépassé. La transcription a peut-être échoué — recharge la page.'
        }));
        clearInterval(interval);
      }
    }, 90_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(failTimeout);
    };
  }, [prayer.id, prayer.status, onUpdated]);

  async function doDelete() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/prayers/vocal/${prayer.id}`, { method: 'DELETE' });
      if (r.ok) onDelete?.(prayer.id);
    } finally {
      setDeleting(false);
    }
  }

  async function togglePublic() {
    setTogglingPublic(true);
    try {
      const r = await fetch(`/api/prayers/vocal/${prayer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !prayer.isPublic })
      });
      const j = await r.json();
      if (r.ok) {
        const next = { ...prayer, isPublic: j.prayer.isPublic };
        setPrayer(next);
        onUpdated?.(next);
      }
    } finally {
      setTogglingPublic(false);
    }
  }

  const mood = prayer.mood ? MOOD_META[prayer.mood] : null;
  const dt = new Date(prayer.createdAt);
  const dateStr = dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <header className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">
              {prayer.title || (prayer.status === 'PROCESSING' ? 'Transcription en cours…' : 'Prière vocale')}
            </h3>
            {mood && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: mood.color + '30', color: mood.color }}
              >
                {mood.emoji} {prayer.mood}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <Clock size={10} /> {dateStr}
            {prayer.durationSec ? <> · {prayer.durationSec}s</> : null}
          </p>
        </div>

        <button
          onClick={togglePublic}
          disabled={togglingPublic || prayer.status !== 'COMPLETED'}
          className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 disabled:opacity-40"
          style={{
            backgroundColor: prayer.isPublic ? 'rgba(34,211,238,0.2)' : 'rgba(63,63,70,0.6)',
            color: prayer.isPublic ? '#67e8f9' : '#a1a1aa'
          }}
          title={prayer.isPublic ? 'Public — clique pour rendre privé' : 'Privé — clique pour partager anonymement'}
        >
          {prayer.isPublic ? <><Globe size={10} /> Public</> : <><Lock size={10} /> Privé</>}
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
            className="text-zinc-500 hover:text-rose-400 transition"
            title="Supprimer (irréversible)"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={doDelete} disabled={deleting}
              className="text-[11px] px-2 py-1 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold">
              {deleting ? <Loader2 size={11} className="animate-spin" /> : 'Confirmer'}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-300">
              Annuler
            </button>
          </div>
        )}
      </header>

      {/* Audio player */}
      {prayer.audioUrl && (
        <audio
          src={prayer.audioUrl}
          controls
          preload="metadata"
          className="w-full mb-3"
        />
      )}

      {/* Statut PROCESSING */}
      {prayer.status === 'PROCESSING' && (
        <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 flex items-center gap-3">
          <Loader2 size={16} className="animate-spin text-violet-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-violet-200 font-bold">L'IA transcrit ta prière…</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Cela prend généralement 5 à 30 secondes selon la durée.</p>
          </div>
        </div>
      )}

      {/* Statut FAILED */}
      {prayer.status === 'FAILED' && (
        <div className="bg-rose-500/5 border border-rose-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-rose-200">Transcription impossible</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">
                {prayer.errorMessage || 'Une erreur est survenue lors de la transcription.'}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Tu peux toujours réécouter ton audio ci-dessus. Pour réessayer la transcription, supprime puis réenregistre.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transcription COMPLETED */}
      {prayer.status === 'COMPLETED' && prayer.transcription && (
        <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="text-fuchsia-400" />
            <span className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold">Transcription IA</span>
          </div>
          <p className="text-sm text-zinc-200 whitespace-pre-line leading-relaxed">{prayer.transcription}</p>
        </div>
      )}
    </article>
  );
}
