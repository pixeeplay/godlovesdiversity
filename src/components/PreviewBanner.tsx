/**
 * PreviewBanner — bandeau sticky en haut de page si mode preview actif.
 * Affiché uniquement sur staging quand ?preview=paris|france est utilisé.
 * Permet de basculer entre les 2 fronts pour voir les différences.
 */
import { headers } from 'next/headers';
import { getScope, detectScope } from '@/lib/scope';

export function PreviewBanner() {
  let scope: string = 'dev';
  let isStaging = false;
  try {
    const h = headers();
    scope = h.get('x-site-scope') || 'dev';
    const host = h.get('host') || '';
    isStaging = host.includes('lgbt.pixeeplay.com') || host.includes('localhost');
  } catch {}

  // Affiche le banner uniquement sur staging quand un preview actif (paris/france)
  if (!isStaging || (scope !== 'paris' && scope !== 'france')) return null;

  const isParis = scope === 'paris';
  const bg = isParis ? '#FF2BB1' : '#6D28D9';
  const label = isParis ? '🌈 Preview : Paris LGBT (parislgbt.com)' : '🏳️‍🌈 Preview : LGBT France (lgbtfrance.fr)';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] py-2 px-4 text-center text-white text-sm font-bold flex items-center justify-center gap-3 shadow-lg"
      style={{ background: bg }}
    >
      <span>{label}</span>
      <a
        href={isParis ? '?preview=france' : '?preview=paris'}
        className="ml-2 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded-full text-xs transition"
      >
        ↔ Basculer sur {isParis ? 'France' : 'Paris'}
      </a>
      <a
        href="?preview=reset"
        className="px-3 py-0.5 bg-black/30 hover:bg-black/40 rounded-full text-xs transition"
      >
        ✕ Quitter preview
      </a>
    </div>
  );
}
