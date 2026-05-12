'use client';

import { useState } from 'react';

type Entry = {
  id: string;
  date: string;
  mood: string;
  moodScore: number;
  body: string;
  bodyShort?: string | null;
  stats: any;
};

const MOOD_GRADIENTS: Record<string, string> = {
  joyful: 'linear-gradient(135deg, #f59e0b, #ec4899)',
  reflective: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
  energetic: 'linear-gradient(135deg, #ef4444, #f59e0b)',
  calm: 'linear-gradient(135deg, #06b6d4, #10b981)',
  melancholic: 'linear-gradient(135deg, #3f3f46, #71717a)',
  curious: 'linear-gradient(135deg, #d946ef, #3b82f6)',
};

const MOOD_EMOJIS: Record<string, string> = {
  joyful: '☀️', reflective: '🌙', energetic: '🔥',
  calm: '🌊', melancholic: '🌧️', curious: '✨',
};

export function JournalIaFeed({ orgSlug: _orgSlug, initial }: { orgSlug: string; initial: Entry[] }) {
  const [expanded, setExpanded] = useState<string | null>(initial[0]?.id || null);

  if (initial.length === 0) {
    return (
      <div style={{
        background: '#0d0d12', border: '1px solid #27272a', borderRadius: 14,
        padding: 48, textAlign: 'center',
      }}>
        <div style={{ fontSize: 56, opacity: 0.4 }}>📖</div>
        <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 12 }}>Aucune entrée pour l'instant — le journal se construira au fil du temps.</p>
      </div>
    );
  }

  return (
    <div>
      {initial.map((e) => {
        const isOpen = expanded === e.id;
        const grad = MOOD_GRADIENTS[e.mood] || MOOD_GRADIENTS.reflective;
        const dateLabel = new Date(e.date).toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        return (
          <article key={e.id} style={{
            background: '#18181b', border: '1px solid #27272a',
            borderLeft: '4px solid transparent',
            borderImage: `${grad} 1`,
            borderRadius: 14, marginBottom: 14, overflow: 'hidden',
          }}>
            <button
              onClick={() => setExpanded(isOpen ? null : e.id)}
              style={{
                width: '100%', background: 'transparent', color: 'inherit',
                border: 0, cursor: 'pointer', padding: 18,
                textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: grad, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 24,
                flexShrink: 0,
              }}>{MOOD_EMOJIS[e.mood] || '📖'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
                  {dateLabel}
                </div>
                <div style={{ fontSize: 14, marginTop: 4, opacity: 0.9, lineHeight: 1.5 }}>
                  {isOpen ? '' : (e.bodyShort || e.body.slice(0, 200) + '…')}
                </div>
              </div>
              <div style={{ opacity: 0.4, fontSize: 18 }}>{isOpen ? '−' : '+'}</div>
            </button>
            {isOpen && (
              <div style={{
                padding: '0 18px 18px',
                fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap',
                color: '#fafafa',
              }}>
                {e.body}
                {e.stats && (
                  <div style={{
                    marginTop: 16, padding: 12, background: '#0d0d12',
                    borderRadius: 10, fontSize: 12, opacity: 0.7,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Stats du jour</div>
                    {Object.entries(e.stats).filter(([k]) => k !== 'date').map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{k}</span>
                        <span style={{ fontWeight: 600 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
