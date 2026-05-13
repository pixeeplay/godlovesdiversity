'use client';
/**
 * FrontSwitcher — sélecteur de front dans le BO admin.
 * 2 fronts (Paris LGBT, LGBT France) × 2 environnements (PROD, PREPROD).
 * Garde la sélection dans localStorage → filtre les vues admin par site_id.
 * Au clic sur un environnement, ouvre le front correspondant dans un nouvel onglet.
 */
import { useState, useEffect } from 'react';
import { Home, ExternalLink, Globe, FlaskConical } from 'lucide-react';

const STORAGE_KEY = 'admin.activeFront';
const PREPROD_HOST = 'lgbt.pixeeplay.com';

export type FrontKey = 'paris' | 'france';

export const FRONTS: Record<FrontKey, {
  label: string;
  prodDomain: string;
  previewParam: string;
  color: string;
  emoji: string;
}> = {
  paris: {
    label: 'Paris LGBT',
    prodDomain: 'parislgbt.com',
    previewParam: 'paris',
    color: '#FF2BB1',
    emoji: '🌈'
  },
  france: {
    label: 'LGBT France',
    prodDomain: 'lgbtfrance.fr',
    previewParam: 'france',
    color: '#6D28D9',
    emoji: '🏳️‍🌈'
  }
};

function buildProdUrl(key: FrontKey, path: string = '/'): string {
  return `https://${FRONTS[key].prodDomain}${path}`;
}

function buildPreprodUrl(key: FrontKey, path: string = '/'): string {
  const sep = path.includes('?') ? '&' : '?';
  return `https://${PREPROD_HOST}${path}${sep}preview=${FRONTS[key].previewParam}`;
}

export function FrontSwitcher() {
  const [active, setActive] = useState<FrontKey>('paris');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FrontKey | null;
      if (stored && FRONTS[stored]) setActive(stored);
    } catch {}
  }, []);

  function select(key: FrontKey) {
    setActive(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
    // Broadcast event so other admin components react
    window.dispatchEvent(new CustomEvent('admin:front-changed', { detail: { front: key } }));
  }

  function openLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3 border-b border-zinc-800">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 px-1">Front actif</div>

      {/* Toggle Paris LGBT / LGBT France (filtre les vues admin) */}
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(FRONTS) as FrontKey[]).map((key) => {
          const f = FRONTS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => select(key)}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-bold transition-all ${
                isActive
                  ? 'ring-2 ring-offset-1 ring-offset-zinc-900 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              style={isActive ? { background: f.color, borderColor: f.color } : undefined}
              title={`Sélectionner ${f.label} comme front actif (filtre les vues admin)`}
            >
              <span className="text-base">{f.emoji}</span>
              <span className="leading-tight mt-0.5">{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tableau Prod / Preprod */}
      <div className="text-[9px] uppercase tracking-widest text-zinc-500 px-1 mt-1 flex items-center gap-1">
        <Globe size={9} /> Ouvrir le front
      </div>
      <div className="rounded-lg border border-zinc-800 overflow-hidden text-[10px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_1fr] bg-zinc-900 text-zinc-500 font-semibold">
          <div className="px-2 py-1">&nbsp;</div>
          <div className="px-2 py-1 border-l border-zinc-800 text-center flex items-center justify-center gap-1">
            <Globe size={9} /> PROD
          </div>
          <div className="px-2 py-1 border-l border-zinc-800 text-center flex items-center justify-center gap-1">
            <FlaskConical size={9} /> PRE-PROD
          </div>
        </div>
        {/* Rows */}
        {(Object.keys(FRONTS) as FrontKey[]).map((key) => {
          const f = FRONTS[key];
          return (
            <div key={key} className="grid grid-cols-[60px_1fr_1fr] border-t border-zinc-800">
              <div className="px-2 py-1.5 bg-zinc-900/50 flex items-center gap-1 font-bold" style={{ color: f.color }}>
                <span>{f.emoji}</span>
              </div>
              <button
                onClick={() => openLink(buildProdUrl(key))}
                className="px-2 py-1.5 border-l border-zinc-800 hover:bg-emerald-500/10 text-zinc-300 hover:text-emerald-300 transition flex items-center justify-center gap-1 group"
                title={`Ouvrir https://${f.prodDomain} (PROD)`}
              >
                <span className="truncate">{f.prodDomain}</span>
                <ExternalLink size={8} className="opacity-0 group-hover:opacity-100" />
              </button>
              <button
                onClick={() => openLink(buildPreprodUrl(key))}
                className="px-2 py-1.5 border-l border-zinc-800 hover:bg-amber-500/10 text-zinc-300 hover:text-amber-300 transition flex items-center justify-center gap-1 group"
                title={`Ouvrir ${PREPROD_HOST}?preview=${f.previewParam} (PREPROD)`}
              >
                <span className="truncate">{PREPROD_HOST}</span>
                <ExternalLink size={8} className="opacity-0 group-hover:opacity-100" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helpers exportés pour réutiliser ailleurs (ex: SeoBoostsClient)
export { buildProdUrl, buildPreprodUrl, PREPROD_HOST };

/**
 * Hook pour lire le front actif côté client (utilisable par n'importe quel composant admin).
 */
export function useActiveFront(): FrontKey {
  const [front, setFront] = useState<FrontKey>('paris');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as FrontKey | null;
      if (stored && FRONTS[stored]) setFront(stored);
    } catch {}
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.front) setFront(detail.front);
    };
    window.addEventListener('admin:front-changed', onChange);
    return () => window.removeEventListener('admin:front-changed', onChange);
  }, []);
  return front;
}
