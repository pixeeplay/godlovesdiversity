'use client';

import { useState } from 'react';

const TYPES = [
  { id: 'contract', label: 'Contrat', emoji: '📄' },
  { id: 'cgv', label: 'CGV', emoji: '🛒' },
  { id: 'cgu', label: 'CGU', emoji: '📋' },
  { id: 'rgpd', label: 'Politique RGPD', emoji: '🔒' },
  { id: 'cookies', label: 'Cookies', emoji: '🍪' },
];

const RISK_COLORS: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

export function AssistantJuridiqueClient({ orgSlug }: { orgSlug: string }) {
  const [type, setType] = useState('contract');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (text.trim().length < 50) {
      setError('Document trop court (min 50 caractères)');
      return;
    }
    setBusy(true); setError(null); setAnalysis(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/assistant-juridique/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: text, type }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setAnalysis(j.analysis || { raw: j.raw });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf') {
      setError('PDFs non supportés pour l\'instant — copie-colle le texte.');
      return;
    }
    const t = await file.text();
    setText(t);
  }

  return (
    <div>
      <div style={{ background: '#0d0d12', border: '1px solid #27272a', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {TYPES.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} style={{
              fontSize: 12, padding: '8px 14px', borderRadius: 10,
              border: '1px solid ' + (type === t.id ? '#06b6d4' : '#27272a'),
              background: type === t.id ? '#06b6d422' : '#18181b',
              color: type === t.id ? '#fafafa' : '#a1a1aa',
              cursor: 'pointer', fontWeight: 600,
            }}>{t.emoji} {t.label}</button>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Document à analyser</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Colle ici le texte de ton contrat / CGV / CGU…"
          rows={10}
          style={{
            width: '100%', padding: 12, background: '#0a0a0f',
            border: '1px solid #3f3f46', borderRadius: 10, color: '#fafafa',
            fontSize: 13, fontFamily: 'inherit', resize: 'vertical', minHeight: 200,
          }}
        />
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
          {text.length} chars · ~{Math.round(text.length / 4)} tokens
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            background: '#18181b', color: '#a1a1aa',
            border: '1px solid #27272a',
            padding: '8px 14px', borderRadius: 10,
            fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>
            📂 Importer un .txt
            <input type="file" onChange={onFile} accept=".txt,text/plain" style={{ display: 'none' }} />
          </label>
          <button
            onClick={analyze}
            disabled={busy}
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              color: 'white', border: 0,
              padding: '10px 22px', borderRadius: 10,
              fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
              fontSize: 13,
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '⏳ Analyse en cours…' : '🔍 Analyser'}
          </button>
        </div>
        {error && <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
      </div>

      {analysis && (
        <div style={{ background: '#0d0d12', border: '1px solid #27272a', borderRadius: 14, padding: 20 }}>
          {analysis.summary && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={sectionTitle}>📌 Résumé</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{analysis.summary}</p>
              {analysis.documentType && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>Type détecté : <strong>{analysis.documentType}</strong></div>}
            </section>
          )}
          {Array.isArray(analysis.parties) && analysis.parties.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={sectionTitle}>👥 Parties</h3>
              <ul style={{ paddingLeft: 18, fontSize: 14 }}>{analysis.parties.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>
            </section>
          )}
          {Array.isArray(analysis.clauses) && analysis.clauses.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={sectionTitle}>📚 Clauses analysées</h3>
              {analysis.clauses.map((c: any, i: number) => (
                <div key={i} style={{
                  background: '#18181b', border: '1px solid #27272a',
                  borderLeft: `4px solid ${RISK_COLORS[c.risk] || '#27272a'}`,
                  borderRadius: 10, padding: 12, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 14 }}>{c.title}</strong>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: (RISK_COLORS[c.risk] || '#27272a') + '22', color: RISK_COLORS[c.risk] || '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>{c.risk}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.9 }}>{c.summary}</p>
                  {c.rationale && <p style={{ fontSize: 12, lineHeight: 1.4, marginTop: 6, opacity: 0.65, fontStyle: 'italic' }}>{c.rationale}</p>}
                </div>
              ))}
            </section>
          )}
          {Array.isArray(analysis.missingClauses) && analysis.missingClauses.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={sectionTitle}>⚠ Clauses recommandées manquantes</h3>
              <ul style={{ paddingLeft: 18, fontSize: 14, color: '#f59e0b' }}>
                {analysis.missingClauses.map((m: string, i: number) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}
          {Array.isArray(analysis.gdprIssues) && analysis.gdprIssues.length > 0 && (
            <section style={{ marginBottom: 18 }}>
              <h3 style={sectionTitle}>🔒 Problèmes RGPD</h3>
              <ul style={{ paddingLeft: 18, fontSize: 14, color: '#ef4444' }}>
                {analysis.gdprIssues.map((g: string, i: number) => <li key={i}>{g}</li>)}
              </ul>
            </section>
          )}
          {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
            <section>
              <h3 style={sectionTitle}>💡 Recommandations</h3>
              <ul style={{ paddingLeft: 18, fontSize: 14, color: '#10b981' }}>
                {analysis.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            </section>
          )}
          {analysis.raw && !analysis.summary && (
            <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', opacity: 0.7 }}>{analysis.raw}</pre>
          )}
        </div>
      )}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12, opacity: 0.7, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
};
