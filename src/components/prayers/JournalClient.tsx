'use client';
import { useState } from 'react';
import { ShieldCheck, Loader2, BookHeart, Heart } from 'lucide-react';
import { VocalPrayerRecorder } from './VocalPrayerRecorder';
import { VocalPrayerCard, type VocalPrayerData } from './VocalPrayerCard';

interface Props {
  initialConsent: boolean;
  initialPrayers: VocalPrayerData[];
}

export function JournalClient({ initialConsent, initialPrayers }: Props) {
  const [consent, setConsent] = useState(initialConsent);
  const [savingConsent, setSavingConsent] = useState(false);
  const [prayers, setPrayers] = useState<VocalPrayerData[]>(initialPrayers);
  const [showFullPolicy, setShowFullPolicy] = useState(false);

  async function acceptConsent() {
    setSavingConsent(true);
    try {
      const r = await fetch('/api/prayers/vocal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true })
      });
      if (r.ok) setConsent(true);
    } finally {
      setSavingConsent(false);
    }
  }

  async function revokeConsent() {
    if (!confirm('Révoquer le consentement bloque la création de nouvelles prières vocales (les anciennes restent jusqu\'à suppression manuelle). Confirmer ?')) {
      return;
    }
    setSavingConsent(true);
    try {
      const r = await fetch('/api/prayers/vocal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: false })
      });
      if (r.ok) setConsent(false);
    } finally {
      setSavingConsent(false);
    }
  }

  function handleUploaded(p: any) {
    // Transforme la réponse server → format VocalPrayerData
    const next: VocalPrayerData = {
      id: p.id,
      audioUrl: `/api/prayers/vocal/${p.id}/audio`,
      audioMime: p.audioMime,
      durationSec: p.durationSec ?? null,
      language: p.language,
      transcription: null,
      title: null,
      mood: null,
      status: 'PROCESSING',
      isPublic: !!p.isPublic,
      transcribedAt: null,
      createdAt: p.createdAt
    };
    setPrayers((arr) => [next, ...arr]);
  }

  function handleDelete(id: string) {
    setPrayers((arr) => arr.filter((p) => p.id !== id));
  }

  function handleUpdated(updated: VocalPrayerData) {
    setPrayers((arr) => arr.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  }

  // Pas encore de consentement → écran d'opt-in RGPD
  if (!consent) {
    return (
      <div className="bg-gradient-to-br from-fuchsia-500/10 to-violet-500/10 border border-fuchsia-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">Consentement requis (RGPD)</h2>
            <p className="text-xs text-zinc-300 mt-1">
              Avant d'enregistrer ta première prière vocale, nous avons besoin de ton accord
              explicite pour traiter ta voix avec un service d'intelligence artificielle.
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 space-y-2 mb-4">
          <p><strong className="text-fuchsia-300">Ce qu'on fait avec ton audio :</strong></p>
          <ul className="space-y-1 text-xs list-disc list-inside text-zinc-400">
            <li>Stockage privé sur nos serveurs (chiffré, accessible uniquement par toi)</li>
            <li>Envoi à Google Gemini uniquement le temps de la transcription (pas de stockage chez Google)</li>
            <li>Conservation tant que tu ne supprimes pas la prière</li>
            <li>Aucun usage publicitaire, aucun entraînement de modèle, aucune revente</li>
          </ul>

          {showFullPolicy && (
            <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400 space-y-2">
              <p><strong className="text-zinc-200">Tes droits (RGPD) :</strong></p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong>Suppression</strong> : tu peux effacer chaque prière individuellement (audio + transcription).</li>
                <li><strong>Révocation</strong> : tu peux retirer ce consentement à tout moment ci-dessous.</li>
                <li><strong>Portabilité</strong> : tu peux télécharger ton audio + texte via le bouton de chaque carte.</li>
                <li><strong>Données sensibles</strong> : les croyances religieuses sont des données sensibles au sens RGPD art. 9 ; ton consentement explicite est légalement requis.</li>
              </ul>
              <p>Responsable de traitement : God Loves Diversity. Contact DPO : <a href="mailto:dpo@gld.pixeeplay.com" className="underline text-fuchsia-300">dpo@gld.pixeeplay.com</a>.</p>
            </div>
          )}

          <button
            onClick={() => setShowFullPolicy(!showFullPolicy)}
            className="text-[11px] text-fuchsia-300 hover:underline"
          >
            {showFullPolicy ? '↑ Réduire' : '↓ Voir la politique complète'}
          </button>
        </div>

        <button
          onClick={acceptConsent}
          disabled={savingConsent}
          className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {savingConsent ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          J'accepte et je veux enregistrer mes prières
        </button>
        <p className="text-[10px] text-zinc-500 text-center mt-2">
          Tu peux refuser sans perdre l'accès au reste du site.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VocalPrayerRecorder onUploaded={handleUploaded} />

      {prayers.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
          <BookHeart size={40} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 font-bold mb-1">Ton journal est vide</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Enregistre ta première prière. Elle apparaîtra ici, transcrite par l'IA quelques secondes après l'envoi.
          </p>
        </div>
      ) : (
        <section>
          <header className="flex items-center gap-2 mb-3">
            <Heart size={14} className="text-fuchsia-400" />
            <h2 className="font-bold text-sm">Mes prières ({prayers.length})</h2>
          </header>
          <div className="space-y-3">
            {prayers.map((p) => (
              <VocalPrayerCard
                key={p.id}
                prayer={p}
                onDelete={handleDelete}
                onUpdated={handleUpdated}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="text-center pt-6 border-t border-zinc-900">
        <button
          onClick={revokeConsent}
          disabled={savingConsent}
          className="text-[11px] text-zinc-500 hover:text-rose-400 underline"
        >
          Révoquer mon consentement au traitement IA
        </button>
      </footer>
    </div>
  );
}
