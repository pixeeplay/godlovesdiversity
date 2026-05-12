'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Post = {
  id?: string; platform: string; content: string; mediaUrls?: string[];
  hashtags?: string[]; scheduledAt?: string | null; publishedAt?: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed'; errorMessage?: string;
};

const PLATFORMS = [
  { v: 'instagram', l: 'Instagram', icon: '📷' },
  { v: 'facebook', l: 'Facebook', icon: '👤' },
  { v: 'linkedin', l: 'LinkedIn', icon: '💼' },
  { v: 'twitter', l: 'Twitter / X', icon: '🐦' },
  { v: 'tiktok', l: 'TikTok', icon: '🎵' },
  { v: 'youtube', l: 'YouTube', icon: '🎬' },
];

export function SocialCalendarClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Post | null>(null);
  const [view, setView] = useState<'list' | 'month'>('list');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterPlatform) qs.set('platform', filterPlatform);
    if (filterStatus) qs.set('status', filterStatus);
    const r = await fetch(`/api/orgs/${orgSlug}/social-posts?${qs}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filterPlatform, filterStatus]);

  async function save() {
    if (!editing) return;
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/social-posts/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/social-posts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    }
    setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ?')) return;
    await fetch(`/api/orgs/${orgSlug}/social-posts/${id}`, { method: 'DELETE' });
    load();
  }

  async function publishNow(id: string) {
    setPublishing(id);
    const r = await fetch(`/api/orgs/${orgSlug}/social-posts/${id}/publish`, { method: 'POST' });
    const j = await r.json();
    setPublishing(null);
    alert(j.note || (j.ok ? 'Publié' : 'Échec'));
    load();
  }

  const byMonth = useMemo(() => {
    const m: Record<string, Post[]> = {};
    for (const p of items) {
      const key = p.scheduledAt ? new Date(p.scheduledAt).toISOString().slice(0, 7) : 'non-programmé';
      m[key] = m[key] || [];
      m[key].push(p);
    }
    return m;
  }, [items]);

  const stats = useMemo(() => ({
    total: items.length,
    scheduled: items.filter((i) => i.status === 'scheduled').length,
    published: items.filter((i) => i.status === 'published').length,
    drafts: items.filter((i) => i.status === 'draft').length,
  }), [items]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="📆" title="Calendrier social"
      desc="Planifie tes posts cross-réseaux : Instagram, Facebook, LinkedIn, Twitter, TikTok, YouTube."
      actions={<button style={btnPrimary} onClick={() => setEditing({ platform: 'instagram', content: '', status: 'draft' })}>+ Post</button>}>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Programmés" value={stats.scheduled} color={colors.primary} />
        <Stat label="Publiés" value={stats.published} color={colors.success} />
        <Stat label="Brouillons" value={stats.drafts} color={colors.textMuted} />
      </section>

      <section style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Toutes plateformes</option>
          {PLATFORMS.map((p) => <option key={p.v} value={p.v}>{p.icon} {p.l}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Tous statuts</option>
          <option value="draft">Brouillon</option><option value="scheduled">Programmé</option>
          <option value="published">Publié</option><option value="failed">Échec</option>
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setView('list')} style={view === 'list' ? btnPrimary : btnSecondary}>Liste</button>
          <button onClick={() => setView('month')} style={view === 'month' ? btnPrimary : btnSecondary}>Mois</button>
        </div>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>📆</div>
          <p style={{ opacity: 0.6 }}>Aucun post. Crée le premier !</p>
        </div>
      ) : view === 'list' ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((p) => <PostCard key={p.id} p={p} onEdit={() => setEditing(p)} onPublish={() => publishNow(p.id!)} onRemove={() => remove(p.id!)} publishing={publishing === p.id} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {Object.keys(byMonth).sort().map((m) => (
            <div key={m} style={{ ...card }}>
              <h3 style={{ marginTop: 0, fontSize: 14 }}>{m}</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {byMonth[m].map((p) => <PostCard key={p.id} p={p} onEdit={() => setEditing(p)} onPublish={() => publishNow(p.id!)} onRemove={() => remove(p.id!)} publishing={publishing === p.id} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouveau'} post</h3>
            <Field label="Plateforme *">
              <select style={input} value={editing.platform} onChange={(e) => setEditing({ ...editing, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p.v} value={p.v}>{p.icon} {p.l}</option>)}
              </select>
            </Field>
            <Field label="Contenu *"><textarea style={{ ...input, minHeight: 120 }} value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></Field>
            <Field label="Hashtags (virgule)">
              <input style={input} value={(editing.hashtags || []).join(', ')}
                onChange={(e) => setEditing({ ...editing, hashtags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
            <Field label="Media URLs (1 par ligne)">
              <textarea style={{ ...input, minHeight: 60 }} value={(editing.mediaUrls || []).join('\n')}
                onChange={(e) => setEditing({ ...editing, mediaUrls: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
            <Field label="Programmer pour">
              <input type="datetime-local" style={input}
                value={editing.scheduledAt ? new Date(editing.scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditing({ ...editing, scheduledAt: e.target.value || null })} />
            </Field>
            <Field label="Statut">
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="draft">Brouillon</option><option value="scheduled">Programmé</option>
                <option value="published">Publié</option><option value="failed">Échec</option>
              </select>
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setEditing(null)}>Annuler</button>
              <button style={btnPrimary} onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}

function PostCard({ p, onEdit, onPublish, onRemove, publishing }: { p: Post; onEdit: () => void; onPublish: () => void; onRemove: () => void; publishing: boolean }) {
  const plat = PLATFORMS.find((x) => x.v === p.platform);
  return (
    <article style={{ ...card, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div style={{ fontSize: 22 }}>{plat?.icon}</div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 11, opacity: 0.6 }}>{plat?.l} · <span style={pill(p.status === 'published' ? '#10b981' : p.status === 'failed' ? '#ef4444' : '#a1a1aa')}>{p.status}</span></div>
        <div style={{ fontSize: 13, marginTop: 4, whiteSpace: 'pre-wrap' }}>{p.content.slice(0, 240)}{p.content.length > 240 && '…'}</div>
        {p.hashtags && p.hashtags.length > 0 && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{p.hashtags.map((h) => `#${h}`).join(' ')}</div>}
        {p.scheduledAt && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>📅 {new Date(p.scheduledAt).toLocaleString('fr-FR')}</div>}
        {p.errorMessage && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠ {p.errorMessage}</div>}
      </div>
      {p.status !== 'published' && (
        <button onClick={onPublish} disabled={publishing} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 12 }}>{publishing ? '…' : 'Publier'}</button>
      )}
      <button onClick={onEdit} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 12 }}>Éditer</button>
      <button onClick={onRemove} style={{ ...btnSecondary, padding: '6px 8px', color: '#ef4444', fontSize: 12 }}>×</button>
    </article>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
function pill(color: string): React.CSSProperties {
  return { background: `${color}22`, color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
}
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' };
