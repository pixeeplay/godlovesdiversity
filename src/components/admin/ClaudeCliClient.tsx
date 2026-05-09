'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Bot, Send, Loader2, AlertTriangle, CheckCircle2, Wrench, FileText,
  Terminal, History, Trash2, KeyRound, ShieldCheck, Sparkles, Square
} from 'lucide-react';

interface Props {
  hasApiKey: boolean;
  authMethod: 'oauth-max' | 'api-key' | 'none';
}

type StreamMsg = {
  type: string;
  raw?: any;
  text?: string;
};

interface Session {
  id: string;
  prompt: string;
  model: string;
  permissionMode: string;
  status: string;
  durationMs: number | null;
  totalInputTokens: number | null;
  totalOutputTokens: number | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
  _count: { messages: number };
}

const MODELS = [
  { id: 'claude-opus-4-5',  label: 'Opus 4.5 (max qualité)' },
  { id: 'claude-sonnet-4-5', label: 'Sonnet 4.5 (équilibré, défaut)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (rapide)' }
];

const PERMISSION_MODES = [
  { id: 'bypassPermissions', label: '⚡ Auto (bypass tout)', desc: 'Claude exécute tout sans confirmation — mode autonome' },
  { id: 'acceptEdits',       label: '✓ Accepter les edits',  desc: 'Auto-accept des Edit/Write, demande confirmation pour Bash' },
  { id: 'default',           label: '🛡 Demander avant',     desc: 'Mode safe — confirmation pour chaque action' }
];

const PROMPT_TEMPLATES = [
  { label: '🎬 Génère une vidéo', text: 'Génère une vidéo de 5 secondes pour mettre en avant la nouveauté X. Utilise les MCPs vidéo disponibles (seedance, fal.ai). Décris la scène avant de générer.' },
  { label: '🐛 Fix le bug', text: 'Lis les logs récents (cherche dans /app), identifie un bug récurrent, propose un fix puis applique-le. Commit + push si autorisé.' },
  { label: '📚 Documente cette page', text: 'Lis le fichier page.tsx de la route X, écris une doc Markdown dans docs/ avec les props, les imports clés, et un exemple d\'usage.' },
  { label: '🚀 Optimise', text: 'Analyse les performances de l\'app Next.js, identifie 3 optimisations rapides (bundle size, re-renders, queries DB), applique-les.' },
  { label: '🧪 Ajoute des tests', text: 'Crée des tests unitaires Jest/Vitest pour le module X. Couverture min 80%.' },
  { label: '✨ Refactor', text: 'Lis ce fichier, propose 3 améliorations de code (lisibilité, perf, types), demande validation puis applique celles validées.' }
];

export function ClaudeCliClient({ hasApiKey, authMethod }: Props) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-5');
  const [permissionMode, setPermissionMode] = useState<'default' | 'acceptEdits' | 'bypassPermissions'>('bypassPermissions');
  const [messages, setMessages] = useState<StreamMsg[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll bottom des messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function loadSessions() {
    try {
      const r = await fetch('/api/admin/claude/sessions', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setSessions(j.sessions || []);
    } catch {}
  }

  useEffect(() => { loadSessions(); }, []);

  async function run() {
    if (!prompt.trim() || running) return;
    setError(null);
    setMessages([]);
    setRunning(true);
    abortRef.current = new AbortController();

    try {
      const r = await fetch('/api/admin/claude/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, permissionMode }),
        signal: abortRef.current.signal
      });

      if (!r.ok || !r.body) {
        const txt = await r.text().catch(() => '');
        throw new Error(`HTTP ${r.status} ${txt.slice(0, 200)}`);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE : "data: {...}\n\n"
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const ev of events) {
          const line = ev.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const data = JSON.parse(line.slice(6));
            setMessages((m) => [...m, data]);
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError(e?.message || 'erreur');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      loadSessions(); // refresh historique
    }
  }

  function cancel() {
    if (abortRef.current) abortRef.current.abort();
    setRunning(false);
  }

  async function deleteSession(id: string) {
    if (!confirm('Supprimer cette session et tous ses messages ?')) return;
    await fetch(`/api/admin/claude/sessions?sessionId=${id}`, { method: 'DELETE' });
    loadSessions();
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-7xl mx-auto">
      {/* WARNING si pas de clé */}
      {!hasApiKey && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-5 mb-6 flex gap-4">
          <AlertTriangle size={28} className="text-amber-400 shrink-0 mt-1" />
          <div className="flex-1">
            <h2 className="font-bold text-amber-200 mb-1">Clé API requise</h2>
            <p className="text-xs text-amber-300/80 mb-3">
              Pour utiliser Claude Code en autonome, configure une de ces variables d'environnement dans Coolify :
            </p>
            <ul className="text-xs space-y-2 mb-3">
              <li className="bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-3 font-mono">
                <strong className="text-emerald-300">ANTHROPIC_API_KEY</strong>=sk-ant-xxxxx<br />
                <span className="text-zinc-500 text-[10px] not-italic">→ API key classique (consumer plan, pay per use)</span>
              </li>
              <li className="bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-3 font-mono">
                <strong className="text-fuchsia-300">CLAUDE_CODE_OAUTH_TOKEN</strong>=...<br />
                <span className="text-zinc-500 text-[10px] not-italic">→ OAuth Max — récupère-le via <code>claude-code login</code> sur ton Mac, puis copie le token de <code>~/.claude/credentials.json</code>. Inclus dans ton abo Max.</span>
              </li>
            </ul>
            <p className="text-xs text-amber-300/80">
              ℹ️ Le SDK <code className="bg-zinc-800 px-1.5 py-0.5 rounded">@anthropic-ai/claude-agent-sdk</code> doit aussi être installé : <code className="bg-zinc-800 px-1.5 py-0.5 rounded">npm i @anthropic-ai/claude-agent-sdk</code>.
            </p>
          </div>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* COLONNE PRINCIPALE — chat */}
        <div className="space-y-4">
          {/* Config */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Modèle</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={running}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Mode de permission</label>
              <select
                value={permissionMode}
                onChange={(e) => setPermissionMode(e.target.value as any)}
                disabled={running}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                {PERMISSION_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <p className="text-[10px] text-zinc-500 mt-1">{PERMISSION_MODES.find((m) => m.id === permissionMode)?.desc}</p>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 text-[11px]">
              <span className={`flex items-center gap-1 ${authMethod === 'none' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {authMethod === 'oauth-max' ? <ShieldCheck size={11} /> : <KeyRound size={11} />}
                {authMethod === 'oauth-max' ? 'OAuth Max' : authMethod === 'api-key' ? 'API key' : 'Pas de credentials'}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">cwd : <code className="bg-zinc-800 px-1 rounded text-[10px]">/app</code></span>
            </div>
          </section>

          {/* Templates rapides */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Prompts rapides</label>
            <div className="flex flex-wrap gap-2">
              {PROMPT_TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(t.text)}
                  disabled={running}
                  className="text-[11px] bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 rounded-full px-3 py-1.5 disabled:opacity-50"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Prompt input */}
          <section className="bg-gradient-to-br from-violet-950/40 to-zinc-900 border border-violet-500/30 rounded-2xl p-4">
            <label className="block text-[10px] uppercase tracking-widest text-violet-300 font-bold mb-2 flex items-center gap-1.5">
              <Sparkles size={11} /> Prompt Claude
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={running}
              placeholder="Décris ce que tu veux que Claude fasse en autonome — corriger un bug, créer une feature, générer un visuel..."
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-[10px] text-zinc-500">
                Cmd+Enter pour lancer · Esc pour annuler
              </p>
              <div className="flex gap-2">
                {running ? (
                  <button
                    onClick={cancel}
                    className="bg-rose-500 hover:bg-rose-400 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Square size={14} fill="white" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={run}
                    disabled={!prompt.trim() || !hasApiKey}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-2"
                  >
                    {running ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Lancer Claude
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Stream / résultat */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: '400px', maxHeight: '60vh' }}>
            <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
              <Bot size={14} className="text-violet-400" />
              <span className="font-bold text-xs">Stream Claude</span>
              {running && <Loader2 size={11} className="animate-spin text-violet-400 ml-auto" />}
              {!running && messages.length > 0 && <CheckCircle2 size={12} className="text-emerald-400 ml-auto" />}
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed space-y-2">
              {messages.length === 0 && !running && (
                <p className="text-zinc-500 text-center py-12">
                  ↑ Lance un prompt pour voir Claude au travail.<br />
                  <span className="text-[10px]">Le stream affichera les messages, les outils utilisés (Read, Write, Edit, Bash), et le résultat final.</span>
                </p>
              )}
              {messages.map((m, i) => <StreamMessage key={i} msg={m} />)}
              {running && (
                <div className="flex items-center gap-2 text-violet-300 animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  Claude travaille…
                </div>
              )}
            </div>
            {error && (
              <div className="bg-rose-950/40 border-t border-rose-500/40 px-4 py-2 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle size={12} /> {error}
              </div>
            )}
          </section>
        </div>

        {/* COLONNE DROITE — historique */}
        <aside className="space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl px-4 py-3 flex items-center gap-2 text-left"
          >
            <History size={14} className="text-zinc-400" />
            <span className="text-xs font-bold flex-1">Historique ({sessions.length})</span>
            <span className="text-[10px] text-zinc-500">{showHistory ? '▼' : '▶'}</span>
          </button>
          {showHistory && (
            <div className="space-y-2 max-h-[80vh] overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">Aucune session.</p>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                        s.status === 'error' ? 'bg-rose-500/20 text-rose-300' :
                        s.status === 'running' ? 'bg-amber-500/20 text-amber-300 animate-pulse' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {s.status}
                      </span>
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="text-zinc-500 hover:text-rose-400"
                        title="Supprimer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <p className="text-zinc-300 line-clamp-2">{s.prompt}</p>
                    <div className="text-[10px] text-zinc-500 mt-1.5 flex flex-wrap gap-2">
                      <span>{new Date(s.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {s.durationMs && <span>· {(s.durationMs / 1000).toFixed(1)}s</span>}
                      <span>· {s._count.messages} msg</span>
                      {s.totalInputTokens && <span>· {s.totalInputTokens + (s.totalOutputTokens || 0)} tok</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Affiche un message du stream avec mise en forme selon le type. */
function StreamMessage({ msg }: { msg: StreamMsg }) {
  // Par type, styliser
  if (msg.type === 'session_started' || msg.type === 'done' || msg.type === 'stream_end') {
    return <div className="text-[10px] uppercase tracking-widest text-zinc-500">— {msg.text || msg.type} —</div>;
  }

  if (msg.type === 'error') {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5 text-rose-200 flex items-start gap-2">
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        <span className="text-[11px] whitespace-pre-wrap">{msg.text}</span>
      </div>
    );
  }

  // Détection tool_use / tool_result via raw
  const content = msg.raw?.message?.content;
  if (Array.isArray(content)) {
    return (
      <div className="space-y-1">
        {content.map((c: any, i: number) => {
          if (c.type === 'text' && c.text) {
            return <div key={i} className="text-zinc-200 whitespace-pre-wrap">{c.text}</div>;
          }
          if (c.type === 'tool_use') {
            return (
              <div key={i} className="bg-violet-500/10 border border-violet-500/30 rounded p-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-300 uppercase tracking-wider mb-1">
                  <Wrench size={10} /> {c.name}
                </div>
                <pre className="text-[10px] text-violet-200/80 whitespace-pre-wrap overflow-x-auto">{JSON.stringify(c.input || {}, null, 2).slice(0, 800)}</pre>
              </div>
            );
          }
          if (c.type === 'tool_result') {
            const resultText = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
            return (
              <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  <Terminal size={10} /> Résultat
                </div>
                <pre className="text-[10px] text-emerald-200/80 whitespace-pre-wrap overflow-x-auto max-h-32">{resultText.slice(0, 1000)}</pre>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback : text
  if (msg.text) {
    return <div className="text-zinc-300 whitespace-pre-wrap">{msg.text}</div>;
  }
  return null;
}
