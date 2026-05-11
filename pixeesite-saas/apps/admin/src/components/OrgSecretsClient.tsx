'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { ORG_KEYS_CATALOG, CATEGORY_LABELS } from '@/lib/secret-keys-catalog';

export function OrgSecretsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/secrets`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.key) return;
    await fetch(`/api/orgs/${orgSlug}/secrets`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette clé ?')) return;
    await fetch(`/api/orgs/${orgSlug}/secrets?id=${id}`, { method: 'DELETE' });
    load();
  }

  const grouped: Record<string, any[]> = {};
  for (const it of items) {
    grouped[it.category] = grouped[it.category] || [];
    grouped[it.category].push(it);
  }
  const existingKeys = new Set(items.map((i) => i.key));
  const suggestions: Record<string, any[]> = {};
  for (const c of ORG_KEYS_CATALOG) {
    if (!existingKeys.has(c.key)) {
      suggestions[c.category] = suggestions[c.category] || [];
      suggestions[c.category].push(c);
    }
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setEditing({ key: '', category: 'ai', value: '' })}>+ Clé</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🔑" title="Clés API"
      desc="Configure tes clés API : IA, image/vidéo, mail, storage, analytics. Chiffrées AES-256-GCM."
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ display: 'grid', gap: 16 }}>
          {Object.keys(CATEGORY_LABELS).map((cat) => {
            const list = grouped[cat] || [];
            const sug = suggestions[cat] || [];
            if (list.length === 0 && sug.length === 0) return null;
            const meta = CATEGORY_LABELS[cat];
            return (
              <section key={cat} style={card}>
                <h3 style={{ marginTop: 0, marginBottom: 12 }}>{meta.emoji} {meta.label}</h3>
                {list.length > 0 && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {list.map((it) => (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: '#0a0a0f', borderRadius: 6 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{it.key}</div>
                          <div style={{ fontSize: 11, opacity: 0.5 }}>{it.description}</div>
                          <div style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.6, marginTop: 2 }}>{it.masked || '—'}</div>
                        </div>
                        <button onClick={() => setEditing({ key: it.key, category: it.category, description: it.description, value: '' })}
                          style={{ background: 'transparent', border: '1px solid #3f3f46', color: 'inherit', padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}
                        >Modifier</button>
                        <button onClick={() => remove(it.id)} style={{ background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                {sug.length > 0 && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.6 }}>+ Suggestions ({sug.length})</summary>
                    <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                      {sug.map((s) => (
                        <button key={s.key}
                          onClick={() => setEditing({ key: s.key, category: s.category, description: s.description, value: '' })}
                          style={{ textAlign: 'left', background: 'transparent', border: '1px dashed #3f3f46', color: 'inherit', padding: 8, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                        >
                          <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.key}</span>
                          <span style={{ opacity: 0.5, marginLeft: 8 }}>{s.description}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 520, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Ajouter / Modifier une clé</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Clé</div>
              <input style={{ ...input, fontFamily: 'monospace' }} placeholder="GEMINI_API_KEY"
                value={editing.key} onChange={(e) => setEditing({ ...editing, key: e.target.value.toUpperCase() })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Catégorie</div>
              <select style={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {Object.entries(CATEGORY_LABELS).map(([k, m]) => <option key={k} value={k}>{m.emoji} {m.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
              <input style={input} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Valeur (sera chiffrée)</div>
              <input style={{ ...input, fontFamily: 'monospace' }} type="password" placeholder="AIzaSy…"
                value={editing.value || ''} onChange={(e) => setEditing({ ...editing, value: e.target.value })} />
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
