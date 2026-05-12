'use client';

import { useState } from 'react';

const THEMES = [
  'inspiration', 'persévérance', 'créativité', 'liberté', 'amour', 'amitié',
  'travail', 'silence', 'nature', 'voyage', 'identité', 'résilience',
];
const MOODS = ['positive', 'douce', 'puissante', 'mélancolique', 'philosophique', 'humoristique'];

type Citation = { text: string; author?: string };

export function CitationIaClient({ orgSlug }: { orgSlug: string }) {
  const [theme, setTheme] = useState('inspiration');
  const [customTheme, setCustomTheme] = useState('');
  const [mood, setMood] = useState('positive');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('short');
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true); setError(null); setResults([]);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/citation-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: customTheme.trim() || theme,
          mood, length, count,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setResults(j.citations || []);
    } catch (e: any) {
      setError(e.message || 'Erreur de connexion');
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  return (
    <div>
      <div style={{ background: '#0d0d12', border: '1px solid #27272a', borderRadius: 14, padding: 20, marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 6 }}>Thème</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {THEMES.map((t) => (
            <button key={t} onClick={() => { setTheme(t); setCustomTheme(''); }} style={{
              fontSize: 12, padding: '6px 10px', borderRadius: 999,
              border: '1px solid ' + (theme === t && !customTheme ? '#d946ef' : '#27272a'),
              background: theme === t && !customTheme ? '#d946ef22' : '#18181b',
              color: theme === t && !customTheme ? '#fafafa' : '#a1a1aa',
              cursor: 'pointer', fontWeight: 600,
            }}>{t}</button>
          ))}
        </div>
        <input
          value={customTheme}
          onChange={(e) => setCustomTheme(e.target.value)}
          placeholder="…ou tape ton thème personnalisé"
          style={{
            width: '100%', padding: 10, background: '#0a0a0f',
            border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa',
            fontSize: 13, fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          <label style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Mood</div>
            <select value={mood} onChange={(e) => setMood(e.target.value)} style={selectStyle}>
              {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Format</div>
            <select value={length} onChange={(e) => setLength(e.target.value as any)} style={selectStyle}>
              <option value="short">Court (1 phrase)</option>
              <option value="medium">Moyen (2 phrases)</option>
              <option value="long">Long (paragraphe)</option>
            </select>
          </label>
          <label style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Nombre</div>
            <input type="number" min={1} max={5} value={count} onChange={(e) => setCount(Math.min(5, Math.max(1, Number(e.target.value))))} style={selectStyle} />
          </label>
        </div>

        <button
          onClick={generate}
          disabled={busy}
          style={{
            marginTop: 16,
            background: 'linear-gradient(135deg, #ec4899, #f59e0b)',
            color: 'white', border: 0,
            padding: '12px 22px', borderRadius: 12,
            fontWeight: 700, cursor: busy ? 'wait' : 'pointer',
            fontSize: 14, width: '100%',
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? '⏳ Génération en cours…' : '✨ Générer'}
        </button>
        {error && <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
      </div>

      {results.length > 0 && (
        <div>
          {results.map((c, i) => (
            <article key={i} style={{
              background: '#18181b', border: '1px solid #27272a',
              borderRadius: 14, padding: 20, marginBottom: 12,
              position: 'relative',
            }}>
              <div style={{ fontSize: 36, position: 'absolute', top: 8, left: 12, opacity: 0.2 }}>"</div>
              <blockquote style={{
                margin: 0, padding: '0 24px',
                fontSize: 16, lineHeight: 1.6,
                fontStyle: 'italic',
                color: '#fafafa',
              }}>{c.text}</blockquote>
              {c.author && <div style={{ marginTop: 12, padding: '0 24px', fontSize: 12, opacity: 0.6, textAlign: 'right' }}>{c.author}</div>}
              <button onClick={() => copy(`${c.text}${c.author ? ` ${c.author}` : ''}`)} style={{
                position: 'absolute', top: 12, right: 12,
                background: 'transparent', color: '#a1a1aa',
                border: '1px solid #27272a',
                padding: '4px 10px', borderRadius: 8,
                fontSize: 11, cursor: 'pointer',
              }}>📋 Copier</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: 10, background: '#0a0a0f',
  border: '1px solid #3f3f46', borderRadius: 8, color: '#fafafa',
  fontSize: 13, fontFamily: 'inherit',
};
