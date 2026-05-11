'use client';
import { useEffect, useState, useRef } from 'react';
import { gradients, colors } from '@/lib/design-tokens';

interface Message { role: 'user' | 'assistant'; content: string; ts: number; }

const SUGGESTIONS = [
  { emoji: '🐛', label: 'Le bouton X ne marche pas, fix-le' },
  { emoji: '🥗', label: 'Crée une page /faq avec les 10 questions classiques' },
  { emoji: '🎨', label: 'Refais le hero de la home plus moderne' },
  { emoji: '🔍', label: 'Audit le code et liste les 5 trucs prioritaires à fixer' },
  { emoji: '🚀', label: 'Génère 5 articles SEO sur mon secteur' },
  { emoji: '📧', label: 'Rédige une newsletter pour mes 30 prochains jours' },
  { emoji: '🎯', label: 'Trouve 50 leads dans mon secteur' },
  { emoji: '🌐', label: 'Traduis mon site en anglais et espagnol' },
];

export function ClaudeAutopilot({ orgSlug }: { orgSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [autopilot, setAutopilot] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Open with ⌘J / Ctrl+J
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setOpen((o) => !o);
        setTimeout(() => taRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Persist autopilot toggle
  useEffect(() => {
    const v = localStorage.getItem('pxs.autopilot');
    if (v !== null) setAutopilot(v === '1');
  }, []);
  function toggleAutopilot() {
    const next = !autopilot;
    setAutopilot(next);
    localStorage.setItem('pxs.autopilot', next ? '1' : '0');
  }

  async function send() {
    if (!draft.trim() || !orgSlug) return;
    const userMsg: Message = { role: 'user', content: draft, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    setDraft('');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMsg.content,
          systemPrompt: autopilot
            ? "Tu es Claude AI Autopilot pour le site Pixeesite. Tu peux proposer des actions (edit code, commit, deploy) que l'utilisateur validera via Telegram. Sois bref, précis, propose des étapes numérotées."
            : "Tu es Claude AI Assistant pour Pixeesite. Réponds aux questions du user, propose du code/contenu mais NE PEUX PAS exécuter d'actions automatiques. Maximum 200 mots.",
          feature: 'text',
        }),
      });
      const j = await r.json();
      const reply: Message = {
        role: 'assistant',
        content: r.ok ? (j.output || j.error || 'Pas de réponse') : (j.error || 'Erreur IA'),
        ts: Date.now(),
      };
      setMessages((m) => [...m, reply]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Erreur réseau : ' + e.message, ts: Date.now() }]);
    } finally { setBusy(false); }
  }

  function pickSuggestion(text: string) {
    setDraft(text);
    setTimeout(() => taRef.current?.focus(), 10);
  }

  if (!orgSlug) return null;

  return (
    <>
      {/* Toggle button (floating) */}
      <button onClick={() => { setOpen(true); setTimeout(() => taRef.current?.focus(), 50); }}
        title="Claude AI Autopilot (⌘J)"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          width: 56, height: 56, borderRadius: 16,
          background: gradients.brand, border: 0,
          boxShadow: '0 8px 24px rgba(217,70,239,0.5)',
          cursor: 'pointer', fontSize: 24,
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>🤖</button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(4px)' }}
          />
          {/* Bottom sheet */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
            background: colors.bgCard, borderTop: `1px solid ${colors.borderLight}`,
            borderRadius: '16px 16px 0 0',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp .2s ease-out',
          }}>
            <style>{`
              @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
              .pxs-suggestion-pill:hover { background: ${colors.bgCardHover} !important; }
            `}</style>

            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Claude AI
                  <span style={{ fontSize: 9, padding: '2px 8px', background: '#8b5cf6', color: 'white', borderRadius: 4, fontWeight: 800 }}>SONNET 4.6</span>
                </div>
                <div style={{ fontSize: 11, opacity: 0.6 }}>Décris une tâche, je modifie le code</div>
              </div>
              <a href={`/dashboard/orgs/${orgSlug}/claude-workspace`} target="_blank" rel="noopener noreferrer"
                style={{ color: colors.textMuted, fontSize: 14, textDecoration: 'none', padding: 6 }}>↗</a>
              <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, color: colors.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Autopilot toggle */}
            <div style={{ padding: '10px 20px', background: autopilot ? '#d946ef08' : 'transparent', borderBottom: `1px solid ${colors.border}` }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={autopilot} onChange={toggleAutopilot} style={{ marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>🚁 Mode Autopilot <span style={{ opacity: 0.6, fontWeight: 400 }}>(avec validation Telegram pour les actions critiques)</span></div>
                  <div style={{ opacity: 0.6, marginTop: 2 }}>Claude peut modifier le code, commit, push, redeploy. Tu reçois une demande sur Telegram avant chaque push — tu valides depuis ton téléphone.</div>
                </div>
              </label>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200 }}>
              {messages.length === 0 ? (
                <>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
                    <h3 style={{ margin: '0 0 6px', fontSize: 18 }}>Bonjour 👋</h3>
                    <p style={{ opacity: 0.6, fontSize: 13, margin: 0 }}>Décris ce que tu veux que je fasse. Je peux lire, écrire, modifier ton code, commit + push.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => pickSuggestion(s.label)} className="pxs-suggestion-pill"
                        style={{ background: '#0a0a0f', border: `1px solid ${colors.border}`, color: 'inherit', padding: '12px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 18 }}>{s.emoji}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: m.role === 'user' ? gradients.brand : '#0a0a0f',
                      color: m.role === 'user' ? 'white' : 'inherit',
                      padding: '10px 14px', borderRadius: 12,
                      fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                      border: m.role === 'assistant' ? `1px solid ${colors.border}` : '0',
                    }}>
                      {m.content}
                    </div>
                  ))}
                  {busy && (
                    <div style={{ alignSelf: 'flex-start', padding: '10px 14px', background: '#0a0a0f', borderRadius: 12, opacity: 0.6, fontSize: 13 }}>
                      ⏳ Claude réfléchit…
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Composer */}
            <div style={{ padding: 12, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea ref={taRef}
                value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); } }}
                placeholder="Décris ta tâche… (⌘+Enter pour lancer)"
                style={{
                  flex: 1, padding: 12, background: '#0a0a0f',
                  border: `1px solid ${colors.borderLight}`, borderRadius: 10,
                  color: 'inherit', fontSize: 14, fontFamily: 'inherit',
                  resize: 'none', minHeight: 48, maxHeight: 200,
                }}
                rows={2}
              />
              <button onClick={send} disabled={busy || !draft.trim()}
                style={{
                  background: busy ? colors.bgCardHover : gradients.brand,
                  color: 'white', border: 0,
                  padding: '12px 16px', borderRadius: 10,
                  cursor: busy ? 'wait' : 'pointer', fontSize: 18,
                  minWidth: 48,
                }}>↗</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
