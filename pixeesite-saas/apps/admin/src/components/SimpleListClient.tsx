'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary } from './SimpleOrgPage';

/**
 * Composant generic CRUD avec api/orgs/[slug]/[entity] qui retourne
 * { items: [{ id, title, ... }] }. Utilisé pour Blog/News/Forum/Tasks.
 */
export function SimpleListClient({
  orgSlug, emoji, title, desc, entity, fields, listFields = ['title', 'createdAt'],
}: {
  orgSlug: string;
  emoji: string;
  title: string;
  desc?: string;
  entity: string; // ex: 'articles' (=> /api/orgs/X/articles)
  fields: { name: string; label: string; type?: 'text' | 'textarea' | 'date' | 'email'; required?: boolean }[];
  listFields?: string[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/${entity}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    setSaving(true);
    const r = await fetch(`/api/orgs/${orgSlug}/${entity}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (r.ok) { setShowNew(false); setDraft({}); load(); }
    else alert('Erreur création');
    setSaving(false);
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouveau</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji={emoji} title={title} desc={desc}
      actions={newButton}
    >
      {loading ? (
        <p style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>Chargement…</p>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
          <p style={{ opacity: 0.6, margin: '0 0 16px' }}>Aucun élément. Crée le premier !</p>
          <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Créer</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((it) => (
            <article key={it.id} style={{ ...card, padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{it.title || it.subject || it.name || '(sans titre)'}</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>
                  {it.status && <span style={{ marginRight: 8 }}>{it.status}</span>}
                  {it.createdAt && <span>{new Date(it.createdAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Nouveau</h3>
            {fields.map((f) => (
              <label key={f.name} style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{f.label}{f.required && ' *'}</span>
                {f.type === 'textarea' ? (
                  <textarea value={draft[f.name] || ''} onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })} rows={6} style={input} />
                ) : (
                  <input type={f.type || 'text'} value={draft[f.name] || ''} onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })} style={input} />
                )}
              </label>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ background: 'transparent', border: 0, color: '#a1a1aa', padding: '8px 12px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={create} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
