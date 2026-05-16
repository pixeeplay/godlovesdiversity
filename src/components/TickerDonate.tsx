'use client';
import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';

type Props = {
  items?: string[];
  defaultAmounts?: number[];
};

const DEFAULT_ITEMS = [
  '💖 Soutenez le mouvement',
  '✨ Chaque don fait la différence',
  '🌍 Aidez-nous à diffuser l\'affiche partout dans le monde',
  '🏳️‍🌈 Foi et diversité, ensemble',
  '📣 Faites connaître le mouvement',
  '❤️ Merci pour votre engagement'
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
      className="gld-ticker relative overflow-hidden flex items-center min-h-[36px] border-b border-white/5"
      style={{ background: '#0a0710' }}
    >
      {/* Marquee — défilement ralenti (75s) avec pause au hover */}
      <div className="flex-1 overflow-hidden">
        <div className="flex animate-ticker gap-12 whitespace-nowrap font-medium text-white/75 text-[11px] tracking-wider px-4">
          {loop.map((it, i) => (
            <span key={i} className="flex items-center gap-2">
              <Heart size={10} className="shrink-0 text-brand-pink" />
              <span>{it}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Donation buttons (right side) — sobres, sur fond neutre */}
      <div className="flex items-center gap-1.5 px-3 py-1 shrink-0 relative bg-black/30">
        <span className="hidden sm:inline text-white/60 text-[10px] font-semibold uppercase tracking-wider mr-1">Don :</span>
        {defaultAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => donate(amt)}
            disabled={loading !== null}
            className="px-2.5 py-0.5 rounded-full bg-white/95 text-brand-pink font-bold text-[11px] hover:bg-white transition disabled:opacity-50 flex items-center gap-1"
          >
            {loading === amt ? <Loader2 size={10} className="animate-spin" /> : null}
            {amt}€
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          className="hidden md:inline px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-semibold text-[10px] hover:bg-white/20 transition"
        >
          ★
        </button>
        {customOpen && (
          <div className="flex items-center gap-1">
            <input
              type="number" min={1} max={1000}
              value={customAmount}
              onChange={(e) => setCustomAmount(Math.max(1, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-14 rounded-full px-2 py-0.5 text-center text-brand-pink font-bold bg-white text-[11px] focus:outline-none"
            />
            <button
              onClick={() => donate(customAmount)}
              disabled={loading !== null}
              className="px-2 py-0.5 rounded-full bg-white text-brand-pink text-[10px] font-black hover:bg-white/90"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
