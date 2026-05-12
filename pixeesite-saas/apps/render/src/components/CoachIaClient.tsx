'use client';

import { useState, useRef, useEffect } from 'react';

const SCENARIOS = [
  { id: 'default', label: 'Discussion ouverte', emoji: '💬' },
  { id: 'pro', label: 'Conversation pro', emoji: '💼' },
  { id: 'perso', label: 'Décision perso', emoji: '🧭' },
  { id: 'prep', label: 'Préparer un échange', emoji: '🎙️' },
  { id: 'decision', label: 'Aide à la décision', emoji: '⚖️' },
];

type Msg = { role: 'user' | 'assistant'; content: string };

export function CoachIaClient({ orgSlug }: { orgSlug: string }) {
  const [scenario, setScenario] = useState('default');
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [history]);

  async function send() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setError(null);
    setHistory((h) => [...h, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }]);
    setStreaming(true);

    try {
      const r = await fetch(`/api/orgs/${orgSlug}/coach-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, scenario, conversationId }),
      });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const j = JSON.parse(line);
            if (j.token) {
              setHistory((h) => {
                const copy = [...h];
                copy[copy.length - 1] = { role: 'assistant', content: (copy[copy.length - 1].content || '') + j.token };
                return copy;
              });
            } else if (j.done) {
              if (j.conversationId) setConversationId(j.conversationId);
            } else if (j.error) {
              setError(j.error);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion');
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    setHistory([]);
    setInput('');
    setConversationId(null);
    setError(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => { setScenario(s.id); reset(); }}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid ' + (scenario === s.id ? '#d946ef' : '#27272a'),
              background: scenario === s.id ? '#d946ef22' : '#18181b',
              color: scenario === s.id ? '#fafafa' : '#a1a1aa',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >{s.emoji} {s.label}</button>
        ))}
      </div>

      <div ref={scrollRef} style={{
        background: '#0d0d12', border: '1px solid #27272a', borderRadius: 14,
        padding: 16, height: 460, overflowY: 'auto', marginBottom: 12,
      }}>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.5, paddingTop: 80 }}>
            <div style={{ fontSize: 40 }}>💭</div>
            <p style={{ fontSize: 13, marginTop: 8 }}>Pose ta première question pour démarrer.</p>
          </div>
        ) : history.map((m, i) => (
          <div key={i} style={{
            marginBottom: 14,
            display: 'flex',
            justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '78%',
              padding: '10px 14px',
              borderRadius: 14,
              background: m.role === 'user' ? 'linear-gradient(135deg, #d946ef, #8b5cf6)' : '#18181b',
              border: m.role === 'user' ? 0 : '1px solid #27272a',
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
              color: '#fafafa',
            }}>
              {m.content || (streaming && i === history.length - 1 ? <span style={{ opacity: 0.5 }}>…</span> : '')}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#7f1d1d22', border: '1px solid #ef4444', borderRadius: 10, padding: 10, marginBottom: 10, color: '#fca5a5', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Tape ton message ici… (Entrée pour envoyer, Shift+Entrée pour saut de ligne)"
          rows={2}
          style={{
            flex: 1,
            background: '#0d0d12',
            border: '1px solid #27272a',
            borderRadius: 12,
            padding: 12,
            color: '#fafafa',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={send}
            disabled={streaming || !input.trim()}
            style={{
              background: 'linear-gradient(135deg, #d946ef, #06b6d4)',
              color: 'white', border: 0,
              padding: '10px 22px', borderRadius: 12,
              fontWeight: 700, cursor: streaming ? 'wait' : 'pointer',
              fontSize: 13,
              opacity: (streaming || !input.trim()) ? 0.5 : 1,
            }}
          >
            {streaming ? '⏳' : '➤ Envoyer'}
          </button>
          {history.length > 0 && (
            <button
              onClick={reset}
              style={{
                background: '#18181b', color: '#a1a1aa',
                border: '1px solid #27272a',
                padding: '6px 12px', borderRadius: 10,
                fontSize: 11, cursor: 'pointer',
              }}
            >↺ Nouveau</button>
          )}
        </div>
      </div>
    </div>
  );
}
