'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2, Sparkles, BookOpen } from 'lucide-react';

type Source = { title: string; source: string | null; score: number };
type Msg = { role: 'user' | 'model'; text: string; sources?: Source[]; offTopic?: boolean };

const SUGGESTIONS = [
  'Que dit la Bible sur l\'homosexualité ?',
  'Pourquoi tant de communautés religieuses rejettent les LGBT ?',
  'Existe-t-il des églises inclusives ?',
  'Comment concilier ma foi et mon identité ?'
];

export function AskGldWidget() {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, busy]);

  async function send(q?: string) {
    const question = (q ?? input).trim();
    if (!question) return;
    const next = [...history, { role: 'user' as const, text: question }];
    setHistory(next);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale: 'fr' })
      });
      const j = await r.json();
      setHistory([...next, {
        role: 'model',
        text: j.answer || j.text || 'Désolé, une erreur est survenue.',
        sources: j.sources || [],
        offTopic: !!j.offTopic
      }]);
    } catch {
      setHistory([...next, { role: 'model', text: 'Désolé, je ne peux pas répondre pour le moment.' }]);
    }
    setBusy(false);
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 group"
          aria-label="Demandez à GLD"
        >
          <span className="absolute inset-0 rounded-full bg-brand-pink animate-ping opacity-30" />
          <span className="relative flex items-center gap-2 bg-brand-pink hover:bg-brand-rose text-white pl-4 pr-5 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(255,43,177,.6)]">
            <Sparkles size={18} /> Demandez à GLD
          </span>
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-32px)] h-[560px] max-h-[calc(100vh-48px)] rounded-2xl shadow-[0_0_40px_rgba(255,43,177,.4)] flex flex-col overflow-hidden"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--accent)',
            color: 'var(--fg)'
          }}
        >
          <div
            className="p-4 flex items-center justify-between"
            style={{
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(90deg, var(--halo-1), var(--halo-2))'
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--fg)' }}>Demandez à GLD</div>
                <div className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Assistant inclusif IA · Gemini</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: 'var(--fg-muted)' }}><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            {history.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Bonjour 🌈 Je suis GLD, l'assistant du mouvement. Je réponds avec apaisement aux questions sur la foi et la diversité.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg transition"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--fg-muted)',
                        border: '1px solid var(--border)'
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {history.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className="max-w-[85%] rounded-2xl px-3 py-2 whitespace-pre-wrap"
                  style={
                    m.role === 'user'
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }
                  }
                >
                  {m.text}
                </div>
                {m.role === 'model' && m.sources && m.sources.length > 0 && !m.offTopic && (
                  <div className="max-w-[85%] flex flex-wrap gap-1 px-1">
                    {m.sources.slice(0, 3).map((src, k) => (
                      <span
                        key={k}
                        title={src.source || ''}
                        className="inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5"
                        style={{ background: 'var(--surface)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}
                      >
                        <BookOpen size={9} />
                        {src.title.length > 28 ? src.title.slice(0, 28) + '…' : src.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3 py-2 text-xs flex items-center gap-2"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}
                >
                  <Loader2 size={12} className="animate-spin" /> GLD réfléchit…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="p-3 flex gap-2"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Pose ta question…"
              disabled={busy}
              className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--fg)' }}
            />
            <button type="submit" disabled={busy || !input}
              className="disabled:opacity-50 text-white rounded-full p-2"
              style={{ background: 'var(--accent)' }}
              aria-label="envoyer">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
