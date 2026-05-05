'use client';
import { useState } from 'react';
import { Scale, Loader2, Sparkles, AlertTriangle, BookOpen } from 'lucide-react';

const COUNTRIES = ['FR', 'BE', 'CH', 'CA', 'US', 'GB', 'ES', 'IT', 'PT', 'BR', 'DE', 'AU', 'IN'];
const PRESETS = [
  'Mon employeur me discrimine à cause de mon orientation, que faire ?',
  'Quelles sont mes options pour le PACS / mariage en couple LGBT ?',
  'Je veux changer mon prénom et mention de sexe à l\'état civil, comment ?',
  'Suis-je éligible à l\'asile pour persécution LGBT ?',
  'Mon bailleur refuse de me louer car je suis trans, c\'est légal ?',
  'Mon enfant subit du harcèlement scolaire LGBTphobe, que faire ?'
];

export function LegalAIClient() {
  const [question, setQuestion] = useState('');
  const [country, setCountry] = useState('FR');
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState('');

  async function ask() {
    if (!question) return;
    setBusy(true);
    setAnswer('');
    try {
      const r = await fetch('/api/ai/legal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, country })
      });
      const j = await r.json();
      if (j.ok) setAnswer(j.answer);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-3 mb-3">
          <Scale size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Aide juridique IA</h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Pose ta question sur tes droits LGBT+. L'IA cite les textes de loi, les démarches et les associations.
          <span className="block mt-1 text-amber-400">⚠ Pas un avis juridique — pour ton cas perso, consulte un·e avocat·e.</span>
        </p>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button key={p} onClick={() => setQuestion(p)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300">
              {p.slice(0, 50)}…
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-[1fr_120px] gap-2">
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} placeholder="Ta question juridique…" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm h-fit">
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={ask} disabled={busy || !question} className={`bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2 ${busy ? 'ai-glow ai-glow-subtle' : ''}`}>
          {busy ? <><Loader2 size={14} className="animate-spin" /><span className="ai-shimmer">L'IA analyse…</span></> : <><Sparkles size={14} /> Obtenir une réponse</>}
        </button>
      </div>

      {answer && (
        <div className={`mt-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 ${busy ? 'ai-glow' : ''}`}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-amber-400" />
            <h2 className="font-bold">Analyse juridique</h2>
          </div>
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-zinc-200">{answer}</div>
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>Cette réponse est <strong>indicative</strong>. Pour ta situation personnelle, consulte un·e avocat·e (aide juridictionnelle gratuite si revenus faibles), le Défenseur des Droits (09 69 39 00 00) ou SOS Homophobie (01 48 06 42 41).</span>
          </div>
        </div>
      )}
    </main>
  );
}
