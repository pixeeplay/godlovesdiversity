'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Thread = {
  id: string; title: string; slug: string;
  body?: string | null; authorName?: string | null; authorEmail?: string | null;
  pinned: boolean; locked: boolean; views: number;
  createdAt: string; updatedAt: string;
  _count?: { posts: number };
};

export function ForumAdminClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/forum-threads`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!draft.title) { alert('Titre requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/forum-threads`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!r.ok) { alert('Erreur'); return; }
    setShowNew(false); setDraft({});
    load();
  }

  async function patch(id: string, data: any) {
    await fetch(`/api/orgs/${orgSlug}/forum-threads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce sujet et tous ses messages ?')) return;
    await fetch(`/api/orgs/${orgSlug}/forum-threads/${id}`, { method: 'DELETE' });
    load();
  }

  async function moderate(id: string) {
    setBusy(id);
    const r = await fetch(`/api/orgs/${orgSlug}/forum-threads/${id}/moderate`, { method: 'POST' });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) { alert('Erreur: ' + (j.error || r.status)); return; }
    alert(`Modération IA terminée: ${j.flagged?.length || 0} message(s) signalé(s)`);
  }

  const stats = useMemo(() => {
    const total = items.length;
    const pinned = items.filter((t) => t.pinned).length;
    const locked = items.filter((t) => t.locked).length;
    const posts = items.reduce((s, t) => s + (t._count?.posts || 0), 0);
    return { total, pinned, locked, posts };
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="💬" title="Forum / Discussions"
      desc="Modération des sujets de discussion. Épingler, verrouiller, supprimer + analyse IA."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouveau sujet</button>}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Sujets" value={stats.total} />
        <Stat label="Messages" value={stats.posts} color={colors.primary} />
        <Stat label="Épinglés" value={stats.pinned} color={colors.warning} />
        <Stat label="Verrouillés" value={stats.locked} color="#ef4444" />
      </section>

      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau sujet</h3>
          <label style={lbl}>Titre *</label>
          <input style={input} value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <label style={{ ...lbl, marginTop: 8 }}>Message d'introduction</label>
          <textarea style={{ ...input, minHeight: 80 }} value={draft.body || ''} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={create}>Créer</button>
            <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <p style={{ opacity: 0.6 }}>Aucun sujet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((t) => (
            <div key={t.id} style={{ ...card, padding: 12, opacity: t.locked ? 0.7 : 1 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {t.pinned && <span style={{ ...pill, background: colors.warning + '22', color: colors.warning }}>📌 épinglé</span>}
                    {t.locked && <span style={{ ...pill, background: '#ef444422', color: '#ef4444' }}>🔒 verrouillé</span>}
                    <strong style={{ fontSize: 14 }}>{t.title}</strong>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    par {t.authorName || t.authorEmail || 'anonyme'}
                    · {t._count?.posts || 0} message{(t._count?.posts || 0) > 1 ? 's' : ''}
                    · {t.views} vues
                    · {new Date(t.updatedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }} onClick={() => patch(t.id, { pinned: !t.pinned })}>
                  {t.pinned ? '📌 Désépingler' : '📌 Épingler'}
                </button>
                <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }} onClick={() => patch(t.id, { locked: !t.locked })}>
                  {t.locked ? '🔓 Déverrouiller' : '🔒 Verrouiller'}
                </button>
                <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11, color: colors.info }}
                  disabled={busy === t.id} onClick={() => moderate(t.id)}>
                  {busy === t.id ? '…' : '🤖 IA'}
                </button>
                <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11, color: '#ef4444' }} onClick={() => remove(t.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return <div style={{ ...card, padding: 12 }}>
    <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || 'inherit' }}>{value}</div>
  </div>;
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
