import Link from 'next/link';
import { Star, Check, Sparkles } from 'lucide-react';

export const metadata = { title: 'Membre+ — GLD' };

const PERKS = [
  '🚫 Aucune publicité',
  '🏅 Badge "Membre+" visible sur ton profil',
  '⚡ Accès anticipé aux nouveaux événements (24h avant)',
  '📊 Statistiques perso : impact de tes témoignages, partages, soutiens',
  '🎁 Bon de réduction 15% boutique GLD',
  '✨ Accès aux 50 thèmes saisonniers (sinon limité à 10)',
  '🤖 Studio IA Pro illimité (sinon 10/mois)',
  '🏳️‍🌈 Newsletter mensuelle "Backstage GLD" (coulisses + roadmap)',
  '💬 Chat direct avec l\'équipe GLD',
  '🌍 Soutien direct au mouvement (40% reversés aux assos LGBT)'
];

export default function P() {
  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3"><Star size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">⭐ Membre+</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">Soutiens GLD à long terme. 4€/mois ou 40€/an. Annulable à tout moment.</p>
      </header>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
          <div className="text-xs uppercase font-bold text-zinc-400">Mensuel</div>
          <div className="text-4xl font-bold text-white my-2">4€<span className="text-base text-zinc-400">/mois</span></div>
          <a href="https://buy.stripe.com/test_membre-plus-mensuel" target="_blank" rel="noopener noreferrer" className="block bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold py-2 rounded-full">S'abonner</a>
        </div>
        <div className="bg-gradient-to-br from-amber-500/10 via-fuchsia-500/10 to-violet-500/10 border-2 border-amber-500/40 rounded-2xl p-5 text-center relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-0.5 rounded-full">⭐ -17%</div>
          <div className="text-xs uppercase font-bold text-amber-300">Annuel</div>
          <div className="text-4xl font-bold text-white my-2">40€<span className="text-base text-zinc-400">/an</span></div>
          <a href="https://buy.stripe.com/test_membre-plus-annuel" target="_blank" rel="noopener noreferrer" className="block bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded-full">S'abonner</a>
        </div>
      </div>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-fuchsia-400" /> Avantages</h2>
        <ul className="space-y-2">
          {PERKS.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[10px] text-zinc-400 text-center mt-4">Stripe sécurisé · annulable 1 clic depuis ton espace · pas de questions</p>
    </main>
  );
}
