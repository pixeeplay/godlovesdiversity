'use client';
import { useState } from 'react';
import { BookOpen, Loader2, Sparkles, Heart } from 'lucide-react';

const TRADITIONS = ['auto', 'Bible chrétienne', 'Ancien Testament', 'Coran', 'Torah', 'Soutras bouddhistes', 'Bhagavad-Gita'];
const PRESETS = [
  { label: 'Lévitique 18:22 (interdit homosexualité)', text: 'Tu ne coucheras point avec un homme comme on couche avec une femme.' },
  { label: 'Romains 1:26-27 (Paul)', text: 'Pour cette raison, Dieu les a livrés à des passions infâmes…' },
  { label: '1 Corinthiens 6:9', text: 'Ni les efféminés, ni les infâmes n\'hériteront du royaume de Dieu.' },
  { label: 'Sodome (Genèse 19)', text: 'L\'épisode de Sodome et Gomorrhe' },
  { label: 'Sourate Al-A\'raf 80-84 (Loth)', text: 'Le récit du peuple de Loth dans le Coran' }
];

export function VerseAIClient() {
  const [verse, setVerse] = useState('');
  const [tradition, setTradition] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState('');

  async function analyze() {
    if (!verse) return;
    setBusy(true);
    setAnalysis('');
    try {
      const r = await fetch('/api/ai/inclusive-verse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse, tradition })
      });
      const j = await r.json();
      if (j.ok) setAnalysis(j.analysis);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl p-3 mb-3">
          <BookOpen size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Verset inclusif</h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Un verset utilisé contre toi ? L'IA fournit l'analyse théologique inclusive : contexte, original linguistique, lecture contemporaine.
        </p>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-zinc-400">Versets souvent évoqués (clic pour pré-remplir)</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setVerse(p.text)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_180px] gap-2">
          <textarea value={verse} onChange={(e) => setVerse(e.target.value)} rows={4} placeholder="Colle ici le verset complet…" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          <select value={tradition} onChange={(e) => setTradition(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm h-fit">
            {TRADITIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <button onClick={analyze} disabled={busy || !verse} className={`bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2 ${busy ? 'ai-glow ai-glow-subtle' : ''}`}>
          {busy ? <><Loader2 size={14} className="animate-spin" /><span className="ai-shimmer">Analyse théologique…</span></> : <><Sparkles size={14} /> Analyser</>}
        </button>
      </div>

      {analysis && (
        <div className={`mt-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 ${busy ? 'ai-glow' : ''}`}>
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-zinc-200">{analysis}</div>
          <div className="mt-4 bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 text-xs text-violet-200 flex items-start gap-2">
            <Heart size={14} className="shrink-0 mt-0.5" />
            <span>Tu es aimé·e tel·le que tu es. Aucune lecture juste d'un texte sacré ne peut justifier le rejet d'une personne.</span>
          </div>
        </div>
      )}
    </main>
  );
}
