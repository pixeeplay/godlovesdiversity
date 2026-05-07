'use client';
import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';

type Props = {
  items?: string[];
  defaultAmounts?: number[];
};

const DEFAULT_ITEMS = [
  '🌈 Bienvenue chez parislgbt — le hub queer de Paris',
  '✨ Marche des Fiertés Paris — Samedi 27 juin 2026',
  '💖 Soumets ton lieu LGBT-friendly préféré',
  '🏳️‍🌈 Indépendant · sans publicité · open source',
  '🩺 Annuaire santé sexuelle & médecins LGBT-friendly',
  '🎟️ Tea Dance · Drag Show · Ballroom · Voguing'
];

/**
 * Bandeau Times Square compact, 1 ligne, sticky en haut de page.
 * Marquee à gauche + boutons de don rapide à droite.
 */
export function TickerDonate({ items = DEFAULT_ITEMS, defaultAmounts = [5, 10] }: Props) {
  const [loading, setLoading] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(20);

  async function donate(amount: number) {
    setLoading(amount);
    try {
      const r = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const j = await r.json();
      if (j.url) {
        window.location.href = j.url;
      } else if (j.error) {
        alert(`Don non envoyé : ${j.error}`);
      } else {
        alert('Une erreur est survenue. Réessayez dans un instant.');
      }
    } catch {
      alert('Connexion impossible.');
    }
    setLoading(null);
  }

  const loop = [...items, ...items, ...items];

  return (
    <div
      className="relative overflow-hidden flex items-center min-h-[40px]"
      style={{ background: 'linear-gradient(90deg, #FF2BB1 0%, #8B5CF6 50%, #22D3EE 100%)' }}
    >
      {/* Marquee */}
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker gap-12 whitespace-nowrap font-bold text-white text-xs tracking-wider px-4">
          {loop.map((it, i) => (
            <span key={i} className="flex items-center gap-2">
              <Heart size={11} fill="white" className="shrink-0" />
              <span>{it}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Donation buttons (right side) — fond transparent, juste un léger fade pour lisibilité */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 relative"
           style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.25) 30%, rgba(0,0,0,0.25) 100%)' }}>
        <span className="hidden sm:inline text-white text-[11px] font-bold uppercase tracking-wider mr-1 drop-shadow-sm">Don :</span>
        {defaultAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => donate(amt)}
            disabled={loading !== null}
            className="px-3 py-1 rounded-full bg-white text-brand-pink font-black text-xs hover:bg-yellow-200 transition disabled:opacity-50 shadow flex items-center gap-1"
          >
            {loading === amt ? <Loader2 size={11} className="animate-spin" /> : null}
            {amt}€
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          className="hidden md:inline px-2.5 py-1 rounded-full bg-black/40 text-white font-semibold text-[11px] hover:bg-black/60 transition"
        >
          ★
        </button>
        {customOpen && (
          <div className="flex items-center gap-1">
            <input
              type="number" min={1} max={1000}
              value={customAmount}
              onChange={(e) => setCustomAmount(Math.max(1, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-14 rounded-full px-2 py-0.5 text-center text-brand-pink font-bold bg-white text-xs focus:outline-none"
            />
            <button
              onClick={() => donate(customAmount)}
              disabled={loading !== null}
              className="px-2 py-0.5 rounded-full bg-white text-brand-pink text-[11px] font-black hover:bg-yellow-200"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
