'use client';

import { useState } from 'react';

type Phase = 'intro' | 'interview' | 'review' | 'done';

export function TemoignageIaClient({ orgSlug }: { orgSlug: string }) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [authorName, setAuthorName] = useState('');
  const [topic, setTopic] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [step, setStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(5);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [draft, setDraft] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startInterview() {
    if (!authorName.trim()) { setError('Indique ton prénom'); return; }
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/temoignage-ia/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() || 'votre expérience', authorName }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setConversationId(j.conversationId);
      setCurrentQuestion(j.question);
      setStep(j.step);
      setTotalSteps(j.totalSteps);
      setPhase('interview');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function answerQuestion() {
    if (!answer.trim() || !conversationId) return;
    setBusy(true); setError(null);
    const ans = answer.trim();
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/temoignage-ia/start`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, answer: ans }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setHistory((h) => [...h, { q: currentQuestion, a: ans }]);
      setAnswer('');
      if (j.done) {
        finish();
      } else {
        setCurrentQuestion(j.question);
        setStep(j.step);
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function finish(publish = false) {
    if (!conversationId) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/temoignage-ia/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, authorName, publish }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setDraft(j.draft);
      setPhase(publish ? 'done' : 'review');
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  function reset() {
    setPhase('intro'); setAuthorName(''); setTopic('');
    setConversationId(null); setCurrentQuestion(''); setStep(0);
    setAnswer(''); setHistory([]); setDraft(null); setError(null);
  }

  return (
    <div>
      {error && <div style={{ marginBottom: 12, padding: 10, background: '#7f1d1d22', border: '1px solid #ef4444', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>{error}</div>}

      {phase === 'intro' && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Avant de commencer</h3>
          <label style={labelStyle}>Ton prénom (ou alias)</label>
          <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} style={inputStyle} placeholder="Alex" />
          <label style={labelStyle}>Sujet du témoignage (optionnel)</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} placeholder="Mon premier voyage seul·e, ma reconversion…" />
          <button onClick={startInterview} disabled={busy} style={primaryBtn}>{busy ? '⏳' : '🎤 Démarrer l\'interview'}</button>
        </div>
      )}

      {phase === 'interview' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 12, opacity: 0.6 }}>
            <span>Question {step + 1} / {totalSteps}</span>
            <span>{Math.round(((step + 1) / totalSteps) * 100)} %</span>
          </div>
          <div style={{
            height: 4, background: '#27272a', borderRadius: 99, marginBottom: 18, overflow: 'hidden',
          }}>
            <div style={{
              width: `${((step + 1) / totalSteps) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #d946ef, #ec4899)',
              transition: 'width .3s',
            }} />
          </div>

          {history.length > 0 && (
            <details style={{ marginBottom: 14, fontSize: 12, opacity: 0.6 }}>
              <summary style={{ cursor: 'pointer' }}>Voir mes réponses précédentes</summary>
              <ul style={{ marginTop: 8 }}>
                {history.map((h, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <em>{h.q}</em><br />
                    <strong>{h.a}</strong>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p style={{ fontSize: 17, lineHeight: 1.5, fontWeight: 600, marginBottom: 14 }}>{currentQuestion}</p>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={5}
            placeholder="Ta réponse… (libre, prends ton temps)"
            style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={answerQuestion} disabled={busy || !answer.trim()} style={primaryBtn}>
              {busy ? '⏳' : (step + 1 === totalSteps ? '✓ Terminer' : 'Suivant →')}
            </button>
            <button onClick={reset} style={ghostBtn}>↺ Recommencer</button>
          </div>
        </div>
      )}

      {phase === 'review' && draft && (
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>📝 Ton témoignage</h2>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>Brouillon généré par l'IA à partir de tes réponses. Modifie ou publie.</div>
          <h3 style={{ fontSize: 22 }}>{draft.title}</h3>
          {draft.quote && (
            <blockquote style={{
              borderLeft: '3px solid #d946ef', paddingLeft: 14, fontStyle: 'italic',
              opacity: 0.9, margin: '14px 0',
            }}>« {draft.quote} »</blockquote>
          )}
          <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{draft.body}</div>
          {Array.isArray(draft.tags) && draft.tags.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {draft.tags.map((t: string) => (
                <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: '#27272a', color: '#a1a1aa' }}>#{t}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            <button onClick={() => finish(true)} disabled={busy} style={primaryBtn}>{busy ? '⏳' : '🚀 Soumettre pour publication'}</button>
            <button onClick={reset} style={ghostBtn}>↺ Refaire</button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <h2 style={{ marginTop: 8 }}>Merci !</h2>
          <p style={{ opacity: 0.7, fontSize: 14 }}>Ton témoignage a été soumis pour modération. Il sera publié après validation.</p>
          <button onClick={reset} style={ghostBtn}>↺ Soumettre un autre témoignage</button>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#0d0d12', border: '1px solid #27272a',
  borderRadius: 14, padding: 24,
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: '#0a0a0f',
  border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa',
  fontSize: 13, fontFamily: 'inherit', marginBottom: 12,
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 6, fontWeight: 600 };
const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #d946ef, #ec4899)',
  color: 'white', border: 0,
  padding: '10px 22px', borderRadius: 10,
  fontWeight: 700, cursor: 'pointer', fontSize: 13,
};
const ghostBtn: React.CSSProperties = {
  background: 'transparent', color: '#a1a1aa',
  border: '1px solid #27272a',
  padding: '10px 16px', borderRadius: 10,
  fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
