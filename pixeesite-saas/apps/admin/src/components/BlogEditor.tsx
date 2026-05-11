'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';

export function BlogEditor({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [aiBrief, setAiBrief] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/articles`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const r = await fetch(`/api/orgs/${orgSlug}/articles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); load(); }
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setEditing({ title: '', excerpt: '', bodyHtml: '', status: 'draft' })}>+ Article</button>
  );

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📝" title="Blog"
      desc="Articles, actualités, posts SEO. Génère avec IA."
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>📝</div>
          <p style={{ opacity: 0.6 }}>Aucun article. Crée le premier !</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((a) => (
            <article key={a.id} style={{ ...card, padding: 14, display: 'flex', gap: 12 }}>
              {a.coverImage && <img src={a.coverImage} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                {a.excerpt && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{a.excerpt.slice(0, 100)}…</div>}
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  {a.status} · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <button onClick={() => setEditing(a)} style={btnSecondary}>Éditer</button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvel'} article</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...input, flex: 1 }} placeholder="Brief IA (ex: article SEO sur photographie de mariage, 600 mots)"
                value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} />
              <AiButton orgSlug={orgSlug} feature="text" label="✨ Rédiger"
                systemPrompt={'Tu es un rédacteur SEO expert. Génère un article complet en HTML simple. Format JSON strict : {"title":"...","excerpt":"...","bodyHtml":"<h2>...</h2><p>...</p>"}'}
                promptBuilder={() => aiBrief.trim() || null}
                onResult={(text) => {
                  try {
                    const m = text.match(/\{[\s\S]+\}/);
                    if (!m) throw new Error('no json');
                    const j = JSON.parse(m[0]);
                    setEditing({ ...editing, title: j.title || editing.title, excerpt: j.excerpt, bodyHtml: j.bodyHtml });
                  } catch {
                    setEditing({ ...editing, bodyHtml: text });
                  }
                }}
              />
            </div>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Titre *</div>
              <input style={input} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Extrait</div>
              <textarea style={{ ...input, minHeight: 60 }} value={editing.excerpt || ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Image de couverture (URL)</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={input} value={editing.coverImage || ''} onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })} placeholder="https://..." />
                <button type="button"
                  onClick={async () => {
                    const prompt = window.prompt('Décris l\'image que tu veux (style, sujet)', editing.title || '');
                    if (!prompt) return;
                    const r = await fetch(`/api/orgs/${orgSlug}/ai/image`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt, aspectRatio: '16:9' }),
                    });
                    const j = await r.json();
                    if (j.images?.[0]) setEditing({ ...editing, coverImage: j.images[0].url || j.images[0] });
                    else alert('Erreur génération : ' + (j.error || 'inconnu'));
                  }}
                  style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>
                  🎨 IA Image
                </button>
              </div>
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
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
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
