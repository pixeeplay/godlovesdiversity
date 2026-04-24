'use client';
import { useState, useEffect } from 'react';
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
 * Bandeau défilant style Times Square : message scrollant horizontalement en boucle,
 * avec 2 boutons de don rapide (5€ / 10€) qui ouvrent Square Checkout (Apple Pay inclus).
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
        alert(`Configuration Square incomplète : ${j.error}\n\nLe don de ${amount}€ a été noté. L'administrateur configurera Square dans les prochains jours.`);
      } else {
        alert('Une erreur est survenue. Réessayez dans un instant.');
      }
    } catch {
      alert('Connexion impossible. Vérifie ta connexion internet.');
    }
    setLoading(null);
  }

  // Duplique les items pour la boucle infinie
  const loop = [...items, ...items, ...items];

  return (
    <div className="relative overflow-hidden" style={{ background: 'linear-gradient(90deg, #FF2BB1 0%, #8B5CF6 50%, #FF2BB1 100%)' }}>
      {/* Marquee scrolling */}
      <div className="relative flex py-3">
        <div className="flex shrink-0 animate-ticker gap-16 px-8 whitespace-nowrap font-bold text-white text-sm tracking-wider">
          {loop.map((it, i) => (
            <span key={i} className="flex items-center gap-4">
              <Heart size={14} fill="white" />
              <span>{it}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Donation buttons overlay */}
      <div className="flex items-center justify-center gap-2 py-3 bg-black/30 backdrop-blur-sm border-t border-white/20">
        <span className="text-white/90 text-sm uppercase tracking-widest font-bold mr-2">💛 Faire un don :</span>
        {defaultAmounts.map((amt) => (
          <button
            key={amt}
            onClick={() => donate(amt)}
            disabled={loading !== null}
            className="px-5 py-2 rounded-full bg-white text-brand-pink font-black text-sm hover:bg-yellow-200 transition disabled:opacity-50 shadow-lg flex items-center gap-1"
          >
            {loading === amt ? <Loader2 size={14} className="animate-spin" /> : null}
            {amt} €
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((o) => !o)}
          className="px-4 py-2 rounded-full bg-black/40 text-white font-semibold text-xs hover:bg-black/60 transition"
        >
          Autre montant
        </button>
        {customOpen && (
          <div className="flex items-center gap-1">
            <input
              type="number" min={1} max={1000}
              value={customAmount}
              onChange={(e) => setCustomAmount(Math.max(1, Math.min(1000, Number(e.target.value) || 0)))}
              className="w-20 rounded-full px-3 py-1.5 text-center text-brand-pink font-bold bg-white focus:outline-none"
            />
            <button
              onClick={() => donate(customAmount)}
              disabled={loading !== null}
              className="px-3 py-1.5 rounded-full bg-white text-brand-pink text-xs font-black hover:bg-yellow-200"
            >
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
