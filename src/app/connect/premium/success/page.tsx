import Link from 'next/link';
import { Crown } from 'lucide-react';

export default function PremiumSuccess() {
  return (
    <div className="max-w-md mx-auto text-center backdrop-blur-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-fuchsia-500/20 border border-white/20 rounded-3xl p-8 mt-12">
      <Crown size={40} className="mx-auto mb-4 text-amber-300" />
      <h1 className="text-2xl font-bold mb-2">Bienvenue dans GLD Premium ✨</h1>
      <p className="text-sm text-zinc-300 mb-5">7 jours d'essai gratuit puis 5€/mois. Annulable à tout moment depuis ton espace.</p>
      <Link href="/connect/rencontres" className="inline-block bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 text-white font-bold px-6 py-3 rounded-full">
        Retour aux Rencontres
      </Link>
    </div>
  );
}
