'use client';
/**
 * FrontSwitcher — sélecteur de front dans le BO admin.
 * 2 boutons : parislgbt.com (rose) + lgbtfrance.fr (violet).
 * Garde la sélection dans localStorage → filtre les vues admin par site_id.
 * Au clic, ouvre le front correspondant dans un nouvel onglet.
 */
import { useState, useEffect } from 'react';
import { Home, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'admin.activeFront';

export type FrontKey = 'paris' | 'france';

export const FRONTS: Record<FrontKey, { label: string; domain: string; color: string; emoji: string }> = {
  paris: { label: 'Paris LGBT', domain: 'parislgbt.com', color: '#FF2BB1', emoji: '🌈' },
  france: { label: 'LGBT France', domain: 'lgbtfrance.fr', color: '#6D28D9', emoji: '🏳️‍🌈' }
};

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

  function openFront(key: FrontKey) {
    const url = process.env.NODE_ENV === 'production'
      ? `https://${FRONTS[key].domain}`
      : '/';
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3 border-b border-zinc-800">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 px-1">Front actif</div>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(FRONTS) as FrontKey[]).map((key) => {
          const f = FRONTS[key];
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => select(key)}
              className={`group relative flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-bold transition-all ${
                isActive
                  ? 'ring-2 ring-offset-1 ring-offset-zinc-900 text-white'
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
              style={isActive ? { background: f.color, borderColor: f.color } : undefined}
              title={`Sélectionner ${f.label}`}
            >
              <span className="text-base">{f.emoji}</span>
              <span className="leading-tight mt-0.5">{f.label}</span>
              {isActive && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openFront(key); }}
                  className="absolute -top-1 -right-1 bg-white/20 hover:bg-white/30 rounded p-0.5"
                  title="Ouvrir le front dans un nouvel onglet"
                >
                  <ExternalLink size={9} />
                </button>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => openFront('paris')}
          className="flex items-center justify-center gap-1 py-1 px-2 rounded text-[10px] font-semibold bg-zinc-800/60 hover:bg-pink-500/20 text-zinc-400 hover:text-pink-300 transition"
        >
          <Home size={10} /> parislgbt.com
        </button>
        <button
          onClick={() => openFront('france')}
          className="flex items-center justify-center gap-1 py-1 px-2 rounded text-[10px] font-semibold bg-zinc-800/60 hover:bg-violet-500/20 text-zinc-400 hover:text-violet-300 transition"
        >
          <Home size={10} /> lgbtfrance.fr
        </button>
      </div>
    </div>
  );
}

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
