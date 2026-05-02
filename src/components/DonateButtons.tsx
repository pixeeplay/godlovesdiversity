'use client';
import { useEffect, useState } from 'react';
import { Heart, ExternalLink, Loader2 } from 'lucide-react';

type Props = {
  amounts?: number[];
  showHelloAsso?: boolean;
};

/**
 * Carte de don avec choix : Apple Pay (Square) OU HelloAsso.
 * - Square : checkout direct, redirection
 * - HelloAsso : ouverture nouvelle fenêtre vers la cagnotte associative
 */
export function DonateButtons({ amounts = [5, 10, 20, 50] }: Props) {
  const [helloAssoUrl, setHelloAssoUrl] = useState<string>('');
  const [loading, setLoading] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/settings/public?keys=donate.helloAssoUrl')
      .then((r) => r.json())
      .then((j) => setHelloAssoUrl(j['donate.helloAssoUrl'] || ''))
      .catch(() => {});
  }, []);

  async function donateSquare(amount: number) {
    setLoading(amount);
    try {
      const r = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      const j = await r.json();
      if (j.url) window.location.href = j.url;
      else if (j.error) alert(`Configuration Square : ${j.error}`);
    } catch {
      alert('Connexion impossible.');
    }
    setLoading(null);
  }

  return (
    <div className="bg-white/5 border border-brand-pink/30 rounded-2xl p-6 max-w-md">
      <div className="flex items-center gap-3 mb-4">
        <Heart className="text-brand-pink" />
        <h3 className="font-display font-bold text-xl">Faire un don</h3>
      </div>
      <p className="text-sm text-white/70 mb-5">
        Choisis un montant et un mode de paiement :
      </p>

      {/* SQUARE — Apple Pay / CB */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-white/50 uppercase tracking-widest font-bold">Apple Pay / Carte bancaire</p>
        <div className="grid grid-cols-4 gap-2">
          {amounts.map((amt) => (
            <button
              key={amt}
              onClick={() => donateSquare(amt)}
              disabled={loading !== null}
              className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition flex items-center justify-center gap-1"
            >
              {loading === amt ? <Loader2 size={14} className="animate-spin" /> : null}
              {amt}€
            </button>
          ))}
        </div>
      </div>

      {/* HELLOASSO — associatif sans frais */}
      {helloAssoUrl && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-2">
            HelloAsso <span className="text-emerald-400 normal-case font-normal tracking-normal">(0% de frais, reçu fiscal)</span>
          </p>
          <a
            href={helloAssoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold transition"
          >
            Don sur HelloAsso <ExternalLink size={14} />
          </a>
        </div>
      )}

      <p className="text-xs text-white/40 mt-4 text-center">
        Paiement 100% sécurisé. Pas de stockage de carte côté GLD.
      </p>
    </div>
  );
}
