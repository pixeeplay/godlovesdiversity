'use client';
/**
 * Playground RAG — chat de test avec contrôle total sur les garde-fous.
 *
 * Permet à l'admin de :
 *   - Poser n'importe quelle question (avec ou sans le verrou foi/inclusion)
 *   - Voir la réponse, mais aussi les chunks retrouvés avec leurs scores
 *   - Voir le prompt complet envoyé à Gemini (debug)
 *   - Toggler la détection "hors-sujet" (offTopic)
 *
 * Différence vs le chat public "Demandez à GLD" : ici tout est exposé en clair
 * pour comprendre ce que le RAG voit, comment il match, et ce qu'il répond.
 */
import { useState } from 'react';

type Source = {
  title: string;
  source: string | null;
  score: number;
  chunkId?: string;
  text?: string;
};

type AskResult = {
  answer: string;
  sources: Source[];
  topScore: number;
  offTopic: boolean;
  debugPrompt?: string;
  guardrailsBypass?: boolean;
};

type HistoryEntry = {
  id: string;
  question: string;
  bypassGuardrails: boolean;
  result: AskResult;
  durationMs: number;
};

export function Playground() {
  const [question, setQuestion] = useState('');
  const [bypassGuardrails, setBypassGuardrails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const submit = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      const r = await fetch('/api/admin/knowledge/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, bypassGuardrails }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Ask KO');
      setHistory((prev) => [
        { id: Math.random().toString(36).slice(2), question: q, bypassGuardrails, result: j, durationMs: Date.now() - t0 },
        ...prev,
      ]);
      setQuestion('');
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <a href="/admin/ai/knowledge" className="text-xs text-zinc-500 hover:text-zinc-300">← Bibliothèque</a>
            <h1 className="mt-1 text-2xl font-bold">💬 Playground RAG</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Teste le cerveau GLD en voyant tout ce qui se passe en coulisses : chunks matchés, scores, prompt envoyé.
            </p>
          </div>
        </header>

        {/* GUIDE D'UTILISATION */}
        <div className="mb-4 rounded-2xl bg-violet-950/30 p-4 text-xs text-violet-200 ring-1 ring-violet-800/50">
          <p className="mb-2 font-semibold text-violet-100">🎯 Comment utiliser :</p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              <strong>Choisis un mode ci-dessous</strong> en cliquant sur l'une des deux cards (la card sélectionnée s'illumine).
            </li>
            <li>
              <strong>Mode prod</strong> = comportement réel du chat « Demandez à GLD ». <strong>Mode test admin</strong> = pas de verrou, le RAG répond à tout.
            </li>
            <li>
              Le bouton <strong>⚡ Envoyer</strong> affiche en permanence le mode qui sera utilisé pour ta prochaine question.
            </li>
            <li>
              Onglets <code className="rounded bg-violet-900/50 px-1 font-mono text-violet-100">🧩 Sources</code> et <code className="rounded bg-violet-900/50 px-1 font-mono text-violet-100">📜 Prompt</code> de chaque réponse → voir les chunks matchés et le prompt envoyé à Gemini.
            </li>
          </ol>
        </div>

        {/* Toggle garde-fous : 2 cards radio géantes pour pas se louper */}
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          {/* CARD MODE PROD */}
          <button
            type="button"
            onClick={() => setBypassGuardrails(false)}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all ${
              !bypassGuardrails
                ? 'bg-gradient-to-br from-emerald-900 to-emerald-950 ring-4 ring-emerald-500 shadow-xl shadow-emerald-500/20 scale-[1.02]'
                : 'bg-zinc-900 ring-2 ring-zinc-800 hover:ring-zinc-600 opacity-60 hover:opacity-100'
            }`}
          >
            {!bypassGuardrails && (
              <div className="absolute right-3 top-3 rounded-full bg-emerald-500 p-1 text-white shadow-lg">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="text-3xl">🛡️</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-white">Mode prod</span>
              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Garde-fous ON
              </span>
            </div>
            <p className="mt-2 text-xs text-emerald-100">
              Comportement <strong>identique au chat public</strong>. System prompt GLD complet (verrou foi/inclusion). Questions hors thème → redirigées. Score &lt; 0.55 → marquée zone aveugle.
            </p>
          </button>

          {/* CARD MODE TEST */}
          <button
            type="button"
            onClick={() => setBypassGuardrails(true)}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all ${
              bypassGuardrails
                ? 'bg-gradient-to-br from-rose-900 to-rose-950 ring-4 ring-rose-500 shadow-xl shadow-rose-500/30 scale-[1.02]'
                : 'bg-zinc-900 ring-2 ring-zinc-800 hover:ring-zinc-600 opacity-60 hover:opacity-100'
            }`}
          >
            {bypassGuardrails && (
              <div className="absolute right-3 top-3 rounded-full bg-rose-500 p-1 text-white shadow-lg">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <div className="text-3xl">🔓</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-lg font-bold text-white">Mode test admin</span>
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                Garde-fous OFF
              </span>
            </div>
            <p className="mt-2 text-xs text-rose-100">
              Le RAG répond à <strong>TOUTE question</strong> (météo, code, politique, Sony, etc.). System prompt minimal sans verrou. Détection « hors-sujet » désactivée. Idéal pour tester la base.
            </p>
          </button>
        </div>

        {/* Input */}
        <div className="mb-6 rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Pose ta question…  (Cmd/Ctrl+Enter pour envoyer)"
            rows={3}
            className="w-full rounded-lg bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 focus:outline-none focus:ring-rose-500"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Badge mode persistant — montre TOUJOURS le mode qui sera envoyé */}
            <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ring-1 ${
              bypassGuardrails
                ? 'bg-rose-950 text-rose-200 ring-rose-700'
                : 'bg-emerald-950 text-emerald-200 ring-emerald-700'
            }`}>
              <span>{bypassGuardrails ? '🔓' : '🛡️'}</span>
              <span>{bypassGuardrails ? 'Mode test (garde-fous OFF)' : 'Mode prod (garde-fous ON)'}</span>
            </div>

            {error && <span className="text-xs text-rose-400">⚠ {error}</span>}
            <div className="ml-auto flex gap-2">
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700"
                >Vider l'historique</button>
              )}
              <button
                onClick={submit}
                disabled={loading || !question.trim()}
                className={`rounded-lg px-5 py-1.5 text-sm font-semibold text-white shadow-lg disabled:opacity-40 ${
                  bypassGuardrails
                    ? 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-500'
                    : 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-500'
                }`}
              >
                {loading ? '⏳' : `⚡ Envoyer ${bypassGuardrails ? '(test)' : '(prod)'}`}
              </button>
            </div>
          </div>
        </div>

        {/* Historique */}
        {history.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900 p-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
            <div className="mb-2 text-3xl">🤖</div>
            Aucune question encore. Pose-en une pour voir comment le RAG répond.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((h) => <HistoryCard key={h.id} entry={h} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── HISTORY CARD ─────────────────────────────────────────────── */

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [tab, setTab] = useState<'answer' | 'sources' | 'prompt'>('answer');
  const r = entry.result;

  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800">
      {/* Question */}
      <div className="flex items-start justify-between gap-3 bg-zinc-950 p-4">
        <div className="flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px]">
            <span className="rounded-full bg-violet-900/50 px-2 py-0.5 font-bold uppercase text-violet-300 ring-1 ring-violet-700/50">
              QUESTION
            </span>
            {entry.bypassGuardrails && (
              <span className="rounded-full bg-rose-900/50 px-2 py-0.5 font-bold uppercase text-rose-300 ring-1 ring-rose-700/50">
                🔓 NO-GUARDRAILS
              </span>
            )}
            {r.offTopic && (
              <span className="rounded-full bg-amber-900/50 px-2 py-0.5 font-bold uppercase text-amber-300 ring-1 ring-amber-700/50">
                ⚠ OFF-TOPIC
              </span>
            )}
            <span className="text-zinc-500">·</span>
            <span className="font-mono text-zinc-500">{entry.durationMs} ms</span>
            <span className="text-zinc-500">·</span>
            <span className="font-mono text-zinc-500">top score {r.topScore}</span>
          </div>
          <p className="text-sm font-medium text-zinc-100">{entry.question}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        <TabBtn active={tab === 'answer'} onClick={() => setTab('answer')} label="💬 Réponse" />
        <TabBtn active={tab === 'sources'} onClick={() => setTab('sources')} label={`🧩 Sources (${r.sources.length})`} />
        <TabBtn active={tab === 'prompt'} onClick={() => setTab('prompt')} label="📜 Prompt envoyé" />
      </div>

      {/* Tab content */}
      <div className="p-4">
        {tab === 'answer' && (
          <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
            {r.answer}
          </div>
        )}

        {tab === 'sources' && (
          <div>
            {r.sources.length === 0 ? (
              <div className="rounded-lg bg-amber-950/30 p-3 text-xs text-amber-300 ring-1 ring-amber-800">
                Aucune source matchée. Le RAG a répondu depuis le savoir général de Gemini (pas de bibliothèque, ou tous les chunks sous le seuil).
              </div>
            ) : (
              <div className="space-y-2">
                {r.sources.map((s, i) => <SourceCard key={i} idx={i + 1} src={s} />)}
              </div>
            )}
          </div>
        )}

        {tab === 'prompt' && (
          <div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 ring-1 ring-zinc-800">
              {r.debugPrompt || '(prompt non disponible)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'border-b-2 border-rose-500 text-white'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {label}
    </button>
  );
}

function SourceCard({ idx, src }: { idx: number; src: Source }) {
  const scoreColor =
    src.score >= 0.7 ? 'text-emerald-400 bg-emerald-950/40 ring-emerald-800/50' :
    src.score >= 0.55 ? 'text-sky-400 bg-sky-950/40 ring-sky-800/50' :
    'text-amber-400 bg-amber-950/40 ring-amber-800/50';
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-zinc-950 ring-1 ring-zinc-800">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
            #{idx}
          </span>
          <span className="truncate text-sm text-zinc-100">{src.title}</span>
        </div>
        <span className={`flex-shrink-0 rounded px-2 py-0.5 font-mono text-[10px] font-bold ring-1 ${scoreColor}`}>
          {src.score.toFixed(3)}
        </span>
        <span className="flex-shrink-0 text-zinc-600">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 p-3">
          {src.source && (
            <a href={src.source} target="_blank" rel="noopener noreferrer"
               className="mb-2 block truncate text-[10px] text-violet-400 hover:underline">
              {src.source}
            </a>
          )}
          {src.text && (
            <div className="rounded bg-zinc-900 p-2 text-xs leading-relaxed text-zinc-300">
              {src.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
