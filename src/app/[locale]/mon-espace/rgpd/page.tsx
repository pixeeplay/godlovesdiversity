import { MePageWrap, MeEmpty } from '@/components/me/MePageWrap';
import { Sparkles } from 'lucide-react';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mes données (RGPD) — Mon espace GLD' };
export default function P() {
  return (
    <MePageWrap title="Mes données (RGPD)" emoji="📜">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-300">
        <p className="text-sm mb-2">Export JSON complet + droit à l'oubli.</p>
        <p className="text-[11px] text-zinc-400">🚧 Cette section sera enrichie au fil de l'eau. Pour l'instant les données sont déjà collectées en base — l'affichage arrive très bientôt.</p>
      </div>
    </MePageWrap>
  );
}
