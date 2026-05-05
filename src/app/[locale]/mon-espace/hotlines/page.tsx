import { MePageWrap, MeEmpty } from '@/components/me/MePageWrap';
import { Sparkles } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mes hotlines sauvées — Mon espace GLD' };
export default function P() {
  return (
    <MePageWrap title="Mes hotlines sauvées" emoji="📞">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-300">
        <p className="text-sm mb-2">Numéros locaux + perso que tu as sauvegardés.</p>
        <p className="text-[11px] text-zinc-400">🚧 Cette section sera enrichie au fil de l'eau. Pour l'instant les données sont déjà collectées en base — l'affichage arrive très bientôt.</p>
      </div>
    </MePageWrap>
  );
}
