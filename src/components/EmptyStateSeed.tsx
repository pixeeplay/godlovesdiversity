'use client';
import { useState } from 'react';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

interface Props {
  emoji: string;
  title: string;
  description: string;
  seedEndpoint: string;
  seedLabel: string;
  /** Si l'API doit être appelée en GET au lieu de POST */
  method?: 'POST' | 'GET';
  className?: string;
}

/**
 * Empty state qui propose à un admin de seeder directement la table.
 * Auto-reload après succès pour montrer les données.
 */
export function EmptyStateSeed({ emoji, title, description, seedEndpoint, seedLabel, method = 'POST', className = '' }: Props) {
  const [seeding, setSeeding] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seed() {
    setSeeding(true); setError(null);
    try {
      const r = await fetch(seedEndpoint, { method });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error === 'forbidden' ? 'Accès admin requis (login).' : (j?.message || j?.error || 'Échec du seed'));
        setSeeding(false);
        return;
      }
      setDone(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setError(e?.message || 'Erreur réseau');
      setSeeding(false);
    }
  }

  return (
    <div className={`bg-gradient-to-br from-amber-500/10 via-fuchsia-500/10 to-violet-500/10 border-2 border-amber-500/30 rounded-2xl p-8 text-center ${className}`}>
      <div className="text-5xl mb-3">{emoji}</div>
      <h2 className="font-display font-bold text-2xl text-amber-200 mb-2">{title}</h2>
      <p className="text-sm text-zinc-300 max-w-2xl mx-auto mb-5">{description}</p>

      {!done ? (
        <button
          onClick={seed}
          disabled={seeding}
          className="bg-gradient-to-r from-amber-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 mx-auto"
        >
          {seeding ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {seeding ? 'Seed en cours…' : seedLabel}
        </button>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-200 rounded-full px-5 py-2 inline-flex items-center gap-2 font-bold">
          <CheckCircle2 size={14} /> Seed terminé · rechargement…
        </div>
      )}

      {error && (
        <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs text-rose-200 max-w-md mx-auto">
          ⚠ {error}
        </div>
      )}

      <p className="text-[10px] text-zinc-500 mt-4">
        Réservé aux admins · API : <code className="bg-zinc-900 px-1.5 py-0.5 rounded">{method} {seedEndpoint}</code>
      </p>
    </div>
  );
}
