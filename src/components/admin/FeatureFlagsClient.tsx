'use client';
import { useState } from 'react';
import { ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

const CATEGORIES: Record<string, { label: string; color: string; emoji: string }> = {
  community:    { label: 'Communauté',    color: 'fuchsia', emoji: '👥' },
  security:     { label: 'Sécurité',      color: 'red',     emoji: '🛡' },
  viral:        { label: 'Viralité',      color: 'pink',    emoji: '🚀' },
  ai:           { label: 'IA',            color: 'violet',  emoji: '🤖' },
  monetization: { label: 'Monétisation',  color: 'amber',   emoji: '💰' },
  research:     { label: 'Recherche',     color: 'cyan',    emoji: '🔬' }
};

export function FeatureFlagsClient({ initialFlags, definitions }: { initialFlags: Record<string, boolean>; definitions: any }) {
  const [flags, setFlags] = useState(initialFlags);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(key: string) {
    setBusy(key);
    const next = !flags[key];
    try {
      await fetch('/api/admin/features', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: next })
      });
      setFlags({ ...flags, [key]: next });
    } finally { setBusy(null); }
  }

  // Group by category
  const grouped: Record<string, [string, any][]> = {};
  for (const [k, def] of Object.entries(definitions)) {
    const cat = (def as any).category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push([k, def]);
  }

  const onCount = Object.values(flags).filter(Boolean).length;
  const total = Object.keys(definitions).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-xl p-2.5"><Sparkles size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-display font-bold leading-none">Feature flags</h1>
            <p className="text-zinc-400 text-xs mt-1">Active/désactive les fonctionnalités visibles par les users · {onCount}/{total} actives</p>
          </div>
        </div>
      </header>

      {Object.entries(grouped).map(([cat, items]) => {
        const c = CATEGORIES[cat] || CATEGORIES.community;
        return (
          <section key={cat} className={`bg-${c.color}-500/5 border border-${c.color}-500/30 rounded-2xl p-4`}>
            <h2 className={`text-xs uppercase font-bold text-${c.color}-300 mb-3 flex items-center gap-2`}>
              <span>{c.emoji}</span> {c.label} ({items.length})
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {items.map(([key, def]) => {
                const on = flags[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    disabled={busy === key}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition ${on ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                  >
                    {on ? <ToggleRight size={28} className="text-emerald-400 shrink-0" /> : <ToggleLeft size={28} className="text-zinc-600 shrink-0" />}
                    <div>
                      <div className="font-bold text-sm text-white">{(def as any).name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{key}</div>
                      {(def as any).defaultOn && <div className="text-[9px] text-emerald-300/70 mt-0.5">défaut : ON</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-200">
        💡 Les flags désactivés ne masquent pas les pages directement — ajoute <code>{`if (!await isFeatureEnabled('xxx')) return notFound()`}</code> dans les pages concernées si tu veux bloquer l'accès strict.
        <br/>Sur le dashboard user (<code>/mon-espace</code>), les modules désactivés sont automatiquement cachés.
      </div>
    </div>
  );
}
