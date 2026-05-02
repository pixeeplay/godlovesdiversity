import { setRequestLocale } from 'next-intl/server';
import { DonateButtons } from '@/components/DonateButtons';
import { Heart } from 'lucide-react';

export const metadata = { title: 'Faire un don — God Loves Diversity' };

export default async function DonatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="min-h-screen py-16">
      <div className="container-tight">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="text-brand-pink" size={40} />
          <h1 className="text-4xl md:text-5xl font-display font-black gradient-text">Soutenez le mouvement</h1>
        </div>
        <p className="text-lg text-white/80 mb-10 max-w-2xl">
          Chaque don finance la diffusion des affiches, le développement de l'app, les outils de
          modération, et soutient les actions de terrain pour rendre la foi inclusive.
        </p>

        <DonateButtons />

        <div className="mt-12 grid sm:grid-cols-3 gap-4 text-sm">
          <Stat label="5 €" desc="impriment 10 affiches A3" />
          <Stat label="20 €" desc="financent une journée de modération IA" />
          <Stat label="50 €" desc="financent un kit campagne pour une ville" />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="text-3xl font-bold text-brand-pink">{label}</div>
      <p className="text-white/70 mt-1">{desc}</p>
    </div>
  );
}
