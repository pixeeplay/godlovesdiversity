'use client';
import { useState } from 'react';
import { Wand2, Loader2, Sparkles, RefreshCw, Type, Heart, Zap, ChevronDown, X } from 'lucide-react';

const ACTIONS = [
  { id: 'fix', label: 'Corriger orthographe', icon: '✓', desc: 'Corrige fautes, accords, ponctuation' },
  { id: 'rewrite', label: 'Réécrire', icon: '✏️', desc: 'Améliore le style et la fluidité' },
  { id: 'shorter', label: 'Plus court', icon: '✂️', desc: 'Condense en gardant le message' },
  { id: 'longer', label: 'Plus long', icon: '➕', desc: 'Développe et enrichit' },
  { id: 'inclusive', label: 'Plus inclusif', icon: '🌈', desc: 'Adapte au ton GLD : non-binaire, accueillant' },
  { id: 'punchy', label: 'Plus percutant', icon: '⚡', desc: 'Phrases courtes, impact direct' },
  { id: 'warm', label: 'Plus chaleureux', icon: '❤️', desc: 'Tonalité douce et empathique' },
  { id: 'pro', label: 'Plus pro', icon: '👔', desc: 'Registre professionnel, neutre' }
];

interface Props {
  value: string;
  onChange: (s: string) => void;
  context?: string; // contexte additionnel (ex: "post forum", "newsletter de la semaine du 15 mars")
  className?: string;
}

export function AiTextHelper({ value, onChange, context = '', className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function run(action: string) {
    if (!value || value.trim().length < 3) {
      setError('Écris d\'abord du texte (≥ 3 caractères)');
      return;
    }
    setLoading(action);
    setError(null);
    setSuggestion(null);
    setOpen(false);
    try {
      const r = await fetch('/api/ai/text-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, action, context })
      });
      const j = await r.json();
      if (j.ok && j.result) {
        setSuggestion(j.result);
      } else {
        setError(j.error || 'Échec IA');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(null);
  }

  function applySuggestion() {
    if (!suggestion) return;
    onChange(suggestion);
    setSuggestion(null);
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={!!loading}
          className="text-xs bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 hover:from-fuchsia-500/30 hover:to-violet-500/30 border border-fuchsia-500/40 text-fuchsia-200 px-2 py-1 rounded flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
          <span className="hidden sm:inline">{loading ? 'IA réfléchit…' : 'IA'}</span>
          <ChevronDown size={10} className="opacity-60" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-40 w-64 max-h-80 overflow-y-auto">
            <div className="px-3 py-2 bg-zinc-800/50 text-[10px] uppercase font-bold text-fuchsia-300 border-b border-zinc-800">
              ✨ Aide IA sur ce texte
            </div>
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => run(a.id)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-start gap-2 border-b border-zinc-800/50 last:border-b-0"
              >
                <span className="text-base flex-shrink-0">{a.icon}</span>
                <div className="min-w-0">
                  <div className="font-bold">{a.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <div className="absolute right-0 top-full mt-1 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs p-2 rounded z-30 w-64">
          ⚠ {error}
          <button onClick={() => setError(null)} className="ml-2 text-rose-300 hover:underline">OK</button>
        </div>
      )}

      {suggestion && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70" onClick={() => setSuggestion(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-zinc-900 border border-fuchsia-500/40 rounded-xl shadow-2xl max-w-2xl w-[90vw] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Sparkles className="text-fuchsia-300" size={16} /> Suggestion IA
              </h3>
              <button onClick={() => setSuggestion(null)} className="p-1 hover:bg-zinc-800 rounded">
                <X size={14} />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Avant</div>
                <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">{value}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-fuchsia-300 mb-1">Après IA</div>
                <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded p-3 text-xs text-white max-h-48 overflow-y-auto whitespace-pre-wrap">{suggestion}</div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setSuggestion(null)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-xs">Garder l'original</button>
              <button onClick={applySuggestion} className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-2 rounded text-xs font-bold">✓ Appliquer la suggestion</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
