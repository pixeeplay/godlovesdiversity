'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type ModItem = {
  id: string; type: string; targetId?: string | null; content?: string | null;
  authorName?: string | null; authorEmail?: string | null;
  status: string; aiScore?: number | null; aiLabels?: any;
  decidedBy?: string | null; decidedAt?: string | null; reason?: string | null;
  createdAt: string;
};

const STATUSES = ['pending', 'approved', 'rejected', 'flagged'];
const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: '#f59e0b', label: 'En attente' },
  approved: { color: '#10b981', label: 'Approuvé' },
  rejected: { color: '#ef4444', label: 'Rejeté' },
  flagged: { color: '#8b5cf6', label: 'Signalé' },
};

export function ModerationClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [type, setType] = useState('');

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('status', status);
    if (type) qs.set('type', type);
    const r = await fetch(`/api/orgs/${orgSlug}/moderation?${qs.toString()}`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [status, type]);

  async function decide(id: string, newStatus: string, reason?: string) {
    await fetch(`/api/orgs/${orgSlug}/moderation/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, reason }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement ?')) return;
    await fetch(`/api/orgs/${orgSlug}/moderation/${id}`, { method: 'DELETE' });
    load();
  }

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const i of items) byStatus[i.status] = (byStatus[i.status] || 0) + 1;
    return byStatus;
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🛡️" title="Modération IA"
      desc="File d'attente: forum-posts, commentaires, avis. Score IA + actions rapides. Alerte Telegram sur rejet."
    >
      <section style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map((s) => {
          const m = STATUS_META[s];
          const active = status === s;
          return (
            <button key={s} onClick={() => setStatus(s)}
              style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12, borderColor: active ? m.color : undefined, color: active ? m.color : 'inherit' }}>
              {m.label} {counts[s] != null && <span style={{ opacity: 0.5 }}>({counts[s]})</span>}
            </button>
          );
        })}
        <select style={{ ...input, padding: 8, maxWidth: 200 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tous types</option>
          <option value="forum-post">forum-post</option>
          <option value="comment">comment</option>
          <option value="review">review</option>
          <option value="message">message</option>
        </select>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡️</div>
          <p style={{ opacity: 0.6 }}>Aucun élément en "{STATUS_META[status]?.label || status}".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((m) => {
            const meta = STATUS_META[m.status] || { color: '#a1a1aa', label: m.status };
            const scoreColor = m.aiScore != null
              ? (m.aiScore > 0.7 ? '#ef4444' : m.aiScore > 0.4 ? '#f59e0b' : '#10b981')
              : '#71717a';
            return (
              <div key={m.id} style={{ ...card, padding: 12, borderLeft: `4px solid ${meta.color}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={pill}>{m.type}</span>
                  <span style={{ ...pill, background: meta.color + '22', color: meta.color }}>{meta.label}</span>
                  {m.aiScore != null && (
                    <span style={{ ...pill, background: scoreColor + '22', color: scoreColor }}>
                      🤖 IA {(m.aiScore * 100).toFixed(0)}%
                    </span>
                  )}
                  {m.aiLabels && Array.isArray(m.aiLabels) && m.aiLabels.slice(0, 3).map((l: string) => (
                    <span key={l} style={pill}>{l}</span>
                  ))}
                  <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 'auto' }}>{new Date(m.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: 13, lineHeight: 1.4 }}>{m.content}</p>
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  par {m.authorName || m.authorEmail || 'anonyme'}
                  {m.decidedBy && <> · décidé par {m.decidedBy}</>}
                  {m.reason && <> · raison: {m.reason}</>}
                </div>
                {m.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button style={{ ...btnPrimary, padding: '6px 12px', background: colors.success }}
                      onClick={() => decide(m.id, 'approved')}>✓ Approuver</button>
                    <button style={{ ...btnSecondary, padding: '6px 12px', color: '#ef4444', borderColor: '#ef4444' }}
                      onClick={() => { const r = prompt('Raison du rejet?') || ''; decide(m.id, 'rejected', r); }}>✕ Rejeter</button>
                    <button style={{ ...btnSecondary, padding: '6px 12px', color: '#8b5cf6' }}
                      onClick={() => decide(m.id, 'flagged')}>⚐ Signaler</button>
                    <button style={{ ...btnSecondary, padding: '6px 12px', color: '#71717a', marginLeft: 'auto' }}
                      onClick={() => remove(m.id)}>Supprimer</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </SimpleOrgPage>
  );
}

const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
