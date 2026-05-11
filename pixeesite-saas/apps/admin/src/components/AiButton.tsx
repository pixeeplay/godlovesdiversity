'use client';
import { useState } from 'react';

export function AiButton({
  orgSlug, feature = 'text', label = '✨ Générer avec IA', systemPrompt,
  promptBuilder, onResult, style,
}: {
  orgSlug: string;
  feature?: 'text' | 'image' | 'classification' | 'moderation';
  label?: string;
  systemPrompt?: string;
  promptBuilder: () => string | null;
  onResult: (text: string) => void;
  style?: React.CSSProperties;
}) {
  const [loading, setLoading] = useState(false);

  async function go() {
    const prompt = promptBuilder();
    if (!prompt) { alert('Décris ce que tu veux générer'); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, prompt, systemPrompt }),
      });
      const j = await r.json();
      if (r.ok) onResult(j.output);
      else alert('Erreur IA : ' + (j.error || 'inconnu'));
    } finally { setLoading(false); }
  }

  return (
    <button onClick={go} disabled={loading}
      style={{
        background: loading ? '#3f3f46' : 'linear-gradient(135deg, #d946ef, #06b6d4)',
        color: 'white', border: 0, padding: '8px 14px', borderRadius: 8,
        fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
        ...style,
      }}>
      {loading ? '⏳ Génération…' : label}
    </button>
  );
}
