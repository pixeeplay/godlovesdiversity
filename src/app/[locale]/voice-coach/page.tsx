'use client';
import { useState } from 'react';
import { Mic, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';

const SCENARIOS = [
  { id: 'parents',    label: '👨‍👩‍👧 Coming-out aux parents' },
  { id: 'employeur',  label: '💼 Discussion avec employeur' },
  { id: 'religieux',  label: '🙏 Responsable religieux conservateur' },
  { id: 'ami',        label: '😬 Ami·e maladroit·e' },
  { id: 'ecole',      label: '🏫 Prof face au harcèlement' }
];

export default function P() {
  const [scenario, setScenario] = useState('parents');
  const [history, setHistory] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input;
    setHistory(h => [...h, { role: 'user', content: userMsg }]);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/ai/voice-coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, history, userMessage: userMsg })
      });
      const j = await r.json();
      if (j.ok) setHistory(h => [...h, { role: 'ai', content: j.response }]);
      else alert(j.error);
    } finally { setBusy(false); }
  }

  function reset() { setHistory([]); setInput(''); }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl p-3 mb-3"><Mic size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">🎙 Voice Coach</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">Entraîne-toi à des conversations difficiles. L'IA joue le rôle "adverse" — tape <strong>STOP</strong> pour débriefer.</p>
      </header>

      <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
        {SCENARIOS.map(s => (
          <button key={s.id} onClick={() => { setScenario(s.id); reset(); }} className={`text-xs px-3 py-1.5 rounded-full ${scenario === s.id ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col min-h-[400px]">
        <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px]">
          {history.length === 0 ? (
            <div className="text-zinc-400 text-sm text-center py-8">
              Commence la conversation. L'IA répondra dans le rôle.<br/>
              <span className="text-[11px]">Ex: "Maman, papa, j'ai quelque chose à vous dire..."</span>
            </div>
          ) : history.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-100'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && <div className="flex justify-start"><div className={`bg-zinc-800 rounded-2xl px-3 py-2 ${busy ? 'ai-glow ai-glow-subtle' : ''}`}><Loader2 size={14} className="animate-spin inline" /> <span className="ai-shimmer text-xs">L'IA répond…</span></div></div>}
        </div>
        <div className="border-t border-zinc-800 p-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Ton message…" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-3 py-2 text-sm" />
          <button onClick={send} disabled={busy || !input.trim()} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white rounded-full p-2"><Send size={14} /></button>
          {history.length > 0 && <button onClick={reset} title="Recommencer" className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-full p-2"><RefreshCw size={14} /></button>}
        </div>
      </div>
      <p className="text-[10px] text-zinc-400 text-center mt-3">💡 Tape <strong>STOP</strong> à tout moment pour faire débriefer l'IA sur ta façon de communiquer.</p>
    </main>
  );
}
