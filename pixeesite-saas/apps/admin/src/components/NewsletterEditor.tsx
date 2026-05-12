'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';
import { colors } from '@/lib/design-tokens';

type Campaign = {
  id?: string;
  subject: string;
  bodyHtml?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduledFor?: string | null;
  sentAt?: string | null;
  recipients?: number;
  opens?: number;
  clicks?: number;
  createdAt?: string;
};

export function NewsletterEditor({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [aiBrief, setAiBrief] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sending, setSending] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/newsletters`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/newsletters/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/newsletters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    }
    setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette campagne ?')) return;
    await fetch(`/api/orgs/${orgSlug}/newsletters/${id}`, { method: 'DELETE' });
    load();
  }

  async function sendNow(id: string) {
    if (!confirm('Envoyer cette newsletter à tous les leads opt-in ?')) return;
    setSending(id);
    const r = await fetch(`/api/orgs/${orgSlug}/newsletters/${id}/send`, { method: 'POST' });
    const j = await r.json();
    setSending(null);
    if (j.ok) alert(`✓ ${j.sent}/${j.total} envoyés (${j.failed} échecs)`);
    else alert(`Erreur : ${j.error}`);
    load();
  }

  const filtered = useMemo(() => statusFilter ? items.filter((i) => i.status === statusFilter) : items, [items, statusFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    sent: items.filter((i) => i.status === 'sent').length,
    drafts: items.filter((i) => i.status === 'draft').length,
    totalOpens: items.reduce((s, i) => s + (i.opens || 0), 0),
  }), [items]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="✉️" title="Newsletter"
      desc="Campagnes email — IA pour rédiger, leads opt-in pour cibler, tracking opens/clicks."
      actions={<button style={btnPrimary} onClick={() => setEditing({ subject: '', bodyHtml: '', status: 'draft' })}>+ Campagne</button>}>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Envoyées" value={stats.sent} color={colors.success} />
        <Stat label="Brouillons" value={stats.drafts} color={colors.textMuted} />
        <Stat label="Ouvertures" value={stats.totalOpens} color={colors.primary} />
      </section>

      <section style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Filtre :</span>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Tous</option><option value="draft">Brouillon</option>
          <option value="scheduled">Programmée</option><option value="sent">Envoyée</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>{filtered.length} campagnes</span>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>✉️</div>
          <p style={{ opacity: 0.6 }}>Aucune campagne. Crée la première !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((n) => (
            <article key={n.id} style={{ ...card, padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{n.subject || '(sans objet)'}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  <span style={pill(n.status === 'sent' ? colors.success : '#a1a1aa')}>{n.status}</span>
                  {' · '}{n.createdAt && new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  {n.recipients ? ` · ${n.recipients} destinataires` : ''}
                  {n.opens ? ` · ${n.opens} ouvertures` : ''}
                  {n.clicks ? ` · ${n.clicks} clics` : ''}
                </div>
              </div>
              {n.status !== 'sent' && (
                <button onClick={() => sendNow(n.id!)} disabled={sending === n.id} style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12 }}>
                  {sending === n.id ? 'Envoi…' : '✉ Envoyer'}
                </button>
              )}
              <button onClick={() => setEditing(n)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Éditer</button>
              <button onClick={() => remove(n.id!)} style={{ ...btnSecondary, padding: '6px 10px', color: '#ef4444', fontSize: 12 }}>×</button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvelle'} campagne</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...input, flex: 1 }} placeholder="Brief IA (lance produit, ton, audience, ~200 mots)"
                value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} />
              <AiButton orgSlug={orgSlug} feature="text" label="✨ Rédiger"
                systemPrompt={"Tu es un copywriter email marketing. Génère objet+corps HTML. Format: OBJET: ...\n---\nHTML"}
                promptBuilder={() => aiBrief.trim() || null}
                onResult={(text) => {
                  const m = text.match(/OBJET\s*:\s*(.+?)\n[\s-]+\n([\s\S]+)/i);
                  if (m) setEditing({ ...editing, subject: m[1].trim(), bodyHtml: m[2].trim() });
                  else setEditing({ ...editing, bodyHtml: text });
                }} />
            </div>

            <Field label="Objet *">
              <input style={input} value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            </Field>
            <Field label="Corps HTML">
              <textarea style={{ ...input, minHeight: 240, fontFamily: 'monospace', fontSize: 12 }}
                value={editing.bodyHtml || ''} onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })} />
            </Field>
            <Field label="Statut">
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="draft">Brouillon</option>
                <option value="scheduled">Programmée</option>
                <option value="sent">Envoyée</option>
              </select>
            </Field>

            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>👁️ Prévisualiser</summary>
              <div style={{ marginTop: 8, background: 'white', borderRadius: 8, padding: 16 }}
                dangerouslySetInnerHTML={{ __html: editing.bodyHtml || '<em style="color:#999">Vide</em>' }} />
            </details>

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
