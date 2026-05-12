'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Partner = {
  id?: string; name: string; slug?: string; logoUrl?: string; websiteUrl?: string;
  description?: string; category?: string; featured?: boolean; position?: number;
  contactName?: string; contactEmail?: string; active?: boolean; createdAt?: string;
};

export function PartnersClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterCategory) qs.set('category', filterCategory);
    const r = await fetch(`/api/orgs/${orgSlug}/partners?${qs}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filterCategory]);

  async function save() {
    if (!editing) return;
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/partners/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/partners`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    }
    setEditing(null); load();
  }

  async function toggleFeatured(p: Partner) {
    await fetch(`/api/orgs/${orgSlug}/partners/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ featured: !p.featured }),
    });
    load();
  }

  async function move(p: Partner, delta: number) {
    const next = (p.position || 0) + delta;
    await fetch(`/api/orgs/${orgSlug}/partners/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: next }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce partenaire ?')) return;
    await fetch(`/api/orgs/${orgSlug}/partners/${id}`, { method: 'DELETE' });
    load();
  }

  const categories = useMemo(() => Array.from(new Set(items.map((p) => p.category).filter(Boolean))).sort() as string[], [items]);
  const stats = useMemo(() => ({
    total: items.length,
    featured: items.filter((p) => p.featured).length,
    active: items.filter((p) => p.active !== false).length,
  }), [items]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🤝" title="Partenaires"
      desc="Logos + liens partenaires. Tier featured + ordre custom."
      actions={<button style={btnPrimary} onClick={() => setEditing({ name: '', active: true, position: 0 })}>+ Partenaire</button>}>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Mis en avant" value={stats.featured} color={colors.primary} />
        <Stat label="Actifs" value={stats.active} color={colors.success} />
      </section>

      {categories.length > 0 && (
        <section style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Catégorie :</span>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
            <option value="">Toutes</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </section>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>🤝</div>
          <p style={{ opacity: 0.6 }}>Aucun partenaire.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((p) => (
            <article key={p.id} style={{ ...card, padding: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {p.logoUrl ? <img src={p.logoUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, background: '#fff', padding: 4 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>{p.name?.[0] || '?'}</div>}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>
                  {p.name}{' '}
                  {p.featured && <span style={pill(colors.primary)}>FEATURED</span>}
                  {p.active === false && <span style={pill('#ef4444')}>INACTIF</span>}
                </div>
                {p.websiteUrl && <a href={p.websiteUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, opacity: 0.6 }}>{p.websiteUrl}</a>}
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                  {p.category && <span>{p.category}</span>}
                  {' · position '}{p.position || 0}
                </div>
              </div>
              <button onClick={() => move(p, -1)} style={{ ...btnSecondary, padding: '4px 8px', fontSize: 14 }}>↑</button>
              <button onClick={() => move(p, 1)} style={{ ...btnSecondary, padding: '4px 8px', fontSize: 14 }}>↓</button>
              <button onClick={() => toggleFeatured(p)} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 12 }}>{p.featured ? '☆ Retirer' : '★ Mettre'}</button>
              <button onClick={() => setEditing(p)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Éditer</button>
              <button onClick={() => remove(p.id!)} style={{ ...btnSecondary, padding: '6px 8px', color: '#ef4444', fontSize: 12 }}>×</button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouveau'} partenaire</h3>
            <Field label="Nom *"><input style={input} value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Logo URL"><input style={input} value={editing.logoUrl || ''} onChange={(e) => setEditing({ ...editing, logoUrl: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Site web"><input style={input} value={editing.websiteUrl || ''} onChange={(e) => setEditing({ ...editing, websiteUrl: e.target.value })} placeholder="https://..." /></Field>
            <Field label="Description"><textarea style={{ ...input, minHeight: 80 }} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
            <Field label="Catégorie"><input style={input} value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Sponsor Or, Partenaire média…" /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Field label="Contact (nom)"><input style={input} value={editing.contactName || ''} onChange={(e) => setEditing({ ...editing, contactName: e.target.value })} /></Field>
              <Field label="Contact (email)"><input style={input} type="email" value={editing.contactEmail || ''} onChange={(e) => setEditing({ ...editing, contactEmail: e.target.value })} /></Field>
            </div>
            <Field label="Position"><input type="number" style={input} value={editing.position || 0} onChange={(e) => setEditing({ ...editing, position: parseInt(e.target.value || '0', 10) })} /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
              <span style={{ fontSize: 13 }}>Mis en avant (featured)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              <span style={{ fontSize: 13 }}>Actif</span>
            </label>
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
