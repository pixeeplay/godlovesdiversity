'use client';
import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Square, Sparkles, ExternalLink, Wand2, ShieldCheck } from 'lucide-react';
import { SiriAIProgressBar } from './SiriAIProgressBar';

/**
 * Bouton flottant 🤖 visible sur toutes les pages admin (sauf /admin/login).
 * Au clic → ouvre un drawer latéral avec le chat Claude streaming.
 * Tu peux donner un objectif et Claude peut modifier le code, commit, push.
 *
 * Mode "Autopilot" :
 *   - Active la confirmation Telegram pour les actions critiques (push, deploy)
 *   - Loop : prompt → action → notif Telegram → tu valides → next
 */

type StreamMsg = { type: string; raw?: any; text?: string };

export function FloatingClaudeButton() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [autopilot, setAutopilot] = useState(false);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<StreamMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages]);

  // Esc pour fermer + Cmd+Shift+K pour toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !running) setOpen(false);
      if (e.key === 'k' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onOpenEvent(e: Event) {
      const detail = (e as CustomEvent).detail || {};
      if (detail.prompt) setPrompt(detail.prompt);
      if (typeof detail.autopilot === 'boolean') setAutopilot(detail.autopilot);
      setOpen(true);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('claude:open', onOpenEvent as any);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('claude:open', onOpenEvent as any);
    };
  }, [open, running]);

  async function run() {
    if (!prompt.trim() || running) return;
    setMessages([]);
    setError(null);
    setRunning(true);
    abortRef.current = new AbortController();

    try {
      const enrichedPrompt = autopilot
        ? `${prompt}

[MODE AUTOPILOT ACTIVÉ]
- Tu peux modifier le code, commit, push.
- Avant chaque action critique (push, deploy, suppression DB, modification user), demande validation via Telegram en appelant l'API /api/admin/telegram/ask-approval avec un message clair.
- Attends la réponse user (timeout 5min) avant de continuer.
- Si rejeté, abandonne la tâche.
- Si approuvé, exécute et notifie le résultat.`
        : prompt;

      const r = await fetch('/api/admin/claude/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: enrichedPrompt,
          model: 'claude-sonnet-4-5',
          permissionMode: autopilot ? 'bypassPermissions' : 'acceptEdits'
        }),
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
      if (e?.name !== 'AbortError') setError(e?.message || 'erreur');
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  return (
    <>
      {/* Bouton flottant — toujours visible */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 shadow-2xl shadow-fuchsia-500/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
          title="Claude AI (⌘+Shift+K)"
          aria-label="Ouvrir le chat Claude"
        >
          {/* Halo pulsant */}
          <span className="absolute inset-0 rounded-full bg-fuchsia-500 opacity-40 animate-ping" />
          <Bot size={26} className="relative z-10" />
        </button>
      )}

      {/* Drawer chat */}
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
          {/* Backdrop léger */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => !running && setOpen(false)} />

          {/* Panel */}
          <aside
            role="dialog"
            aria-label="Claude AI assistant"
            className="relative w-full max-w-xl h-full bg-zinc-950 border-l border-violet-500/30 shadow-2xl pointer-events-auto flex flex-col"
            style={{ animation: 'claudeDrawerSlide 0.25s ease-out' }}
          >
            <header className="border-b border-zinc-800 p-4 flex items-center gap-3 bg-gradient-to-r from-violet-950/50 to-fuchsia-950/30">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold flex items-center gap-2">
                  Claude AI
                  <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">Sonnet 4.5</span>
                </h2>
                <p className="text-[10px] text-zinc-400">Décris une tâche, je modifie le code</p>
              </div>
              <a
                href="/admin/claude-cli"
                target="_blank"
                rel="noopener noreferrer"
                title="Ouvrir la page complète"
                className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => !running && setOpen(false)}
                disabled={running}
                className="text-zinc-400 hover:text-white p-1.5 rounded hover:bg-zinc-800 disabled:opacity-40"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </header>

            {/* Mode autopilot */}
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
              <label className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={autopilot}
                  onChange={(e) => setAutopilot(e.target.checked)}
                  disabled={running}
                  className="accent-fuchsia-500 mt-0.5 h-4 w-4"
                />
                <div className="flex-1">
                  <span className={`font-bold ${autopilot ? 'text-fuchsia-300' : 'text-zinc-300'}`}>
                    🚀 Mode Autopilot
                  </span>
                  <span className="text-zinc-500 ml-1 text-[10px]">
                    (avec validation Telegram pour les actions critiques)
                  </span>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Claude peut modifier le code, commit, push, redeploy. Tu reçois une demande sur Telegram avant chaque push — tu valides depuis ton téléphone.
                  </p>
                </div>
              </label>
            </div>

            {/* Stream */}
            <div ref={streamRef} className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[12px] leading-relaxed">
              {messages.length === 0 && !running && (
                <div className="text-center py-12">
                  <Bot size={36} className="text-violet-400 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-zinc-400 mb-3">Bonjour 👋</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Décris ce que tu veux que je fasse. Je peux lire, écrire, modifier ton code, commit + push.
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-6 max-w-sm mx-auto text-left">
                    {[
                      '🐛 Le bouton X ne marche pas, fix-le',
                      '📚 Crée une page /faq avec les 10 questions classiques',
                      '🎨 Refais le hero de la home plus moderne',
                      '🔍 Audit le code et liste les 5 trucs prioritaires à fixer'
                    ].map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(s.replace(/^[\u{1F300}-\u{1FAFF}]\s/u, ''))}
                        className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-left text-zinc-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => <StreamMsg key={i} msg={m} />)}

              {running && (
                <SiriAIProgressBar
                  active
                  variant="banner"
                  cycleMessages={[
                    '🧠 Analyse de ta demande…',
                    '🔍 Lecture des fichiers…',
                    '✏️ Écriture du code…',
                    '🧪 Vérification…'
                  ]}
                />
              )}
            </div>

            {error && (
              <div className="bg-rose-950/40 border-t border-rose-500/40 px-4 py-2 text-xs text-rose-300">⚠ {error}</div>
            )}

            {/* Input */}
            <div className="border-t border-zinc-800 p-3">
              <div className="flex gap-2">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); }
                  }}
                  disabled={running}
                  placeholder="Décris ta tâche… (⌘+Enter pour lancer)"
                  rows={2}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none resize-none"
                />
                {running ? (
                  <button onClick={cancel} className="bg-rose-500 hover:bg-rose-400 text-white px-4 rounded-lg flex items-center gap-1.5 text-sm font-bold">
                    <Square size={12} fill="white" />
                  </button>
                ) : (
                  <button
                    onClick={run}
                    disabled={!prompt.trim()}
                    className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-30 text-white px-4 rounded-lg flex items-center gap-1.5 text-sm font-bold"
                  >
                    <Send size={14} />
                  </button>
                )}
              </div>
              {autopilot && !running && (
                <p className="text-[10px] text-fuchsia-400 mt-1.5 flex items-center gap-1">
                  <ShieldCheck size={10} /> Telegram t'enverra une validation avant chaque push.
                </p>
              )}
            </div>
          </aside>

          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes claudeDrawerSlide {
              from { transform: translateX(100%); opacity: 0; }
              to   { transform: translateX(0); opacity: 1; }
            }
          `}} />
        </div>
      )}
    </>
  );
}

function StreamMsg({ msg }: { msg: StreamMsg }) {
  if (msg.type === 'session_started' || msg.type === 'done' || msg.type === 'stream_end') {
    return <div className="text-[9px] uppercase tracking-widest text-zinc-600">— {msg.text || msg.type} —</div>;
  }
  if (msg.type === 'error') {
    return <div className="bg-rose-500/10 border border-rose-500/30 rounded p-2 text-rose-200 text-xs">⚠ {msg.text}</div>;
  }
  const content = msg.raw?.message?.content;
  if (Array.isArray(content)) {
    return (
      <div className="space-y-1">
        {content.map((c: any, i: number) => {
          if (c.type === 'text' && c.text) return <p key={i} className="text-zinc-200 whitespace-pre-wrap">{c.text}</p>;
          if (c.type === 'tool_use') return (
            <div key={i} className="bg-violet-500/10 border border-violet-500/30 rounded p-1.5 text-[10px]">
              <div className="text-violet-300 font-bold uppercase tracking-wider">🔧 {c.name}</div>
              <code className="text-violet-200/70 line-clamp-2">{JSON.stringify(c.input || {}).slice(0, 200)}</code>
            </div>
          );
          if (c.type === 'tool_result') {
            const t = typeof c.content === 'string' ? c.content : JSON.stringify(c.content);
            return <div key={i} className="bg-emerald-500/10 border border-emerald-500/30 rounded p-1.5 text-[10px] text-emerald-200/70 line-clamp-3">{t.slice(0, 300)}</div>;
          }
          return null;
        })}
      </div>
    );
  }
  if (msg.text) return <p className="text-zinc-300 whitespace-pre-wrap">{msg.text}</p>;
  return null;
}
