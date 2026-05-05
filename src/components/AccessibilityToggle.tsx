'use client';
import { useEffect, useState } from 'react';
import { Accessibility, Type, Eye, X } from 'lucide-react';

/**
 * Bouton flottant accessibilité (a11y) : FALC + dyslexie + grand texte + contraste max.
 * Stocké dans localStorage, appliqué en classes sur <html>.
 */
export function AccessibilityToggle() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState({ falc: false, dyslexia: false, largeText: false, highContrast: false });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gld_a11y') || '{}');
      setOpts({ ...opts, ...saved });
      applyClasses({ ...opts, ...saved });
    } catch {}
  }, []);

  function applyClasses(o: typeof opts) {
    const html = document.documentElement;
    html.classList.toggle('a11y-falc', o.falc);
    html.classList.toggle('a11y-dyslexia', o.dyslexia);
    html.classList.toggle('a11y-large', o.largeText);
    html.classList.toggle('a11y-contrast', o.highContrast);
  }

  function toggle(k: keyof typeof opts) {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    localStorage.setItem('gld_a11y', JSON.stringify(next));
    applyClasses(next);
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[55] bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-xl border-2 border-white/20"
        title="Accessibilité"
        aria-label="Options accessibilité"
      >
        <Accessibility size={20} />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[60] bg-zinc-900 border border-blue-500/40 rounded-2xl p-4 shadow-2xl w-72">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5"><Eye size={14} /> Accessibilité</h3>
            <button onClick={() => setOpen(false)}><X size={16} className="text-zinc-400" /></button>
          </div>
          <ul className="space-y-2">
            <Toggle label="Lecture facile (FALC)" desc="Phrases courtes, vocabulaire simple, gros texte" checked={opts.falc} onChange={() => toggle('falc')} />
            <Toggle label="Police dyslexie" desc="Espacement augmenté, police lisible" checked={opts.dyslexia} onChange={() => toggle('dyslexia')} />
            <Toggle label="Texte agrandi" desc="+25% sur tout le site" checked={opts.largeText} onChange={() => toggle('largeText')} />
            <Toggle label="Contraste maximum" desc="Noir/blanc pur" checked={opts.highContrast} onChange={() => toggle('highContrast')} />
          </ul>
          <p className="text-[10px] text-zinc-400 mt-3">Tes préférences sont sauvegardées localement.</p>
        </div>
      )}
    </>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: () => void }) {
  return (
    <li>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={onChange} className="mt-1" />
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-[10px] text-zinc-400">{desc}</div>
        </div>
      </label>
    </li>
  );
}
