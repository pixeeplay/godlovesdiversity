'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

export function SitemapClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ visibleNav: true, visibleSEO: true, priority: 0.5 });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/sitemap`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await fetch(`/api/orgs/${orgSlug}/sitemap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setShowNew(false);
    setDraft({ visibleNav: true, visibleSEO: true, priority: 0.5 });
    load();
  }

  async function toggle(item: any, field: 'visibleNav' | 'visibleSEO') {
    await fetch(`/api/orgs/${orgSlug}/sitemap`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, [field]: !item[field] }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    await fetch(`/api/orgs/${orgSlug}/sitemap?id=${id}`, { method: 'DELETE' });
    load();
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Entrée</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🗺️" title="Sitemap & Navigation"
      desc="Gère la structure de ton site et le sitemap.xml SEO"
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ opacity: 0.6 }}>Aucune entrée. Crée ton arborescence.</p>
        </div>
      ) : (
        <div style={{ ...card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0a0f' }}>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Path</th>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Label</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Nav</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>SEO</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Priorité</th>
                <th style={{ padding: 10 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={{ borderTop: '1px solid #27272a' }}>
                  <td style={{ padding: 10, fontFamily: 'monospace', opacity: 0.8 }}>{it.path}</td>
                  <td style={{ padding: 10 }}>{it.label}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => toggle(it, 'visibleNav')} style={{ background: 'none', border: 0, fontSize: 16, cursor: 'pointer' }}>
                      {it.visibleNav ? '👁️' : '🚫'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => toggle(it, 'visibleSEO')} style={{ background: 'none', border: 0, fontSize: 16, cursor: 'pointer' }}>
                      {it.visibleSEO ? '✅' : '❌'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center', fontSize: 12, opacity: 0.6 }}>{it.priority ?? '-'}</td>
                  <td style={{ textAlign: 'right', padding: 10 }}>
                    <button onClick={() => remove(it.id)} style={{ background: 'transparent', color: '#ef4444', border: 0, cursor: 'pointer', fontSize: 12 }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Nouvelle entrée sitemap</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Path *</div>
              <input style={input} placeholder="/about" value={draft.path || ''} onChange={(e) => setDraft({ ...draft, path: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Label</div>
              <input style={input} value={draft.label || ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Changefreq</div>
                <select style={input} value={draft.changefreq || ''} onChange={(e) => setDraft({ ...draft, changefreq: e.target.value })}>
                  <option value="">—</option>
                  <option value="always">always</option>
                  <option value="hourly">hourly</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
              </label>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Priorité (0-1)</div>
                <input style={input} type="number" min="0" max="1" step="0.1" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: parseFloat(e.target.value) })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
              <button style={btnPrimary} onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
