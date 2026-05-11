'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';

export function NewsletterEditor({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [aiBrief, setAiBrief] = useState('');

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
    const r = await fetch(`/api/orgs/${orgSlug}/newsletters`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); load(); }
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setEditing({ subject: '', bodyHtml: '', status: 'draft' })}>+ Campagne</button>
  );

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="✉️" title="Newsletter"
      desc="Crée tes campagnes — IA pour rédiger, segments pour cibler, tracking opens/clicks."
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>✉️</div>
          <p style={{ opacity: 0.6 }}>Aucune campagne. Crée la première !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((n) => (
            <article key={n.id} style={{ ...card, padding: 14, display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{n.subject || '(sans objet)'}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  {n.status} · {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  {n.opensCount > 0 && <span> · {n.opensCount} ouvertures</span>}
                  {n.clicksCount > 0 && <span> · {n.clicksCount} clics</span>}
                </div>
              </div>
              <button onClick={() => setEditing(n)} style={btnSecondary}>Éditer</button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvelle'} campagne</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
              <input style={{ ...input, flex: 1 }} placeholder="Brief IA (ex: lance produit X, ton enthousiaste, 200 mots)"
                value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} />
              <AiButton orgSlug={orgSlug} feature="text" label="✨ Rédiger"
                systemPrompt={"Tu es un copywriter expert en email marketing. Génère un objet d'email accrocheur (max 60 caractères) puis le corps de l'email en HTML simple (h1, p, a). Format : OBJET: ...\n---\nHTML"}
                promptBuilder={() => aiBrief.trim() || null}
                onResult={(text) => {
                  const m = text.match(/OBJET\s*:\s*(.+?)\n[\s-]+\n([\s\S]+)/i);
                  if (m) setEditing({ ...editing, subject: m[1].trim(), bodyHtml: m[2].trim() });
                  else setEditing({ ...editing, bodyHtml: text });
                }}
              />
            </div>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Objet</div>
              <input style={input} value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Corps HTML</div>
              <textarea style={{ ...input, minHeight: 240, fontFamily: 'monospace', fontSize: 12 }}
                value={editing.bodyHtml || ''} onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Statut</div>
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="draft">Brouillon</option>
                <option value="scheduled">Programmée</option>
                <option value="sent">Envoyée</option>
              </select>
            </label>

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
