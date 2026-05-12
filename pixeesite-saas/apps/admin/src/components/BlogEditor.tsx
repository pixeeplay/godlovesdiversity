'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';
import { colors } from '@/lib/design-tokens';

type Article = {
  id?: string; title: string; excerpt?: string; bodyHtml?: string; coverImage?: string;
  status: 'draft' | 'published' | 'archived' | 'scheduled'; tags?: string[]; createdAt?: string; publishedAt?: string | null;
};

export function BlogEditor({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [aiBrief, setAiBrief] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

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
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/articles/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/articles`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    }
    setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet article ?')) return;
    await fetch(`/api/orgs/${orgSlug}/articles/${id}`, { method: 'DELETE' });
    load();
  }

  const allTags = useMemo(() => Array.from(new Set(items.flatMap((a) => a.tags || []))).sort(), [items]);
  const filtered = useMemo(() => items.filter((a) => (!statusFilter || a.status === statusFilter) && (!tagFilter || (a.tags || []).includes(tagFilter))), [items, statusFilter, tagFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((a) => a.status === 'published').length,
    drafts: items.filter((a) => a.status === 'draft').length,
  }), [items]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="📝" title="Blog"
      desc="Articles, actualités, SEO. Génère avec IA + upload image de couverture."
      actions={<button style={btnPrimary} onClick={() => setEditing({ title: '', excerpt: '', bodyHtml: '', status: 'draft', tags: [] })}>+ Article</button>}>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Publiés" value={stats.published} color={colors.success} />
        <Stat label="Brouillons" value={stats.drafts} color={colors.textMuted} />
      </section>

      <section style={{ ...card, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
          <option value="">Tous statuts</option><option value="draft">Brouillon</option>
          <option value="published">Publié</option><option value="archived">Archivé</option>
        </select>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
            <option value="">Tous tags</option>
            {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
          </select>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11, opacity: 0.5 }}>{filtered.length} articles</span>
      </section>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>📝</div>
          <p style={{ opacity: 0.6 }}>Aucun article.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((a) => (
            <article key={a.id} style={{ ...card, padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {a.coverImage && <img src={a.coverImage} alt="" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 6 }} />}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                {a.excerpt && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{a.excerpt.slice(0, 100)}…</div>}
                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>
                  <span style={pill(a.status === 'published' ? colors.success : '#a1a1aa')}>{a.status}</span>
                  {a.tags?.map((t) => <span key={t} style={{ ...pill('#a78bfa'), marginLeft: 4 }}>#{t}</span>)}
                  {a.createdAt && <span style={{ marginLeft: 6 }}>{new Date(a.createdAt).toLocaleDateString('fr-FR')}</span>}
                </div>
              </div>
              <button onClick={() => setEditing(a)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Éditer</button>
              <button onClick={() => remove(a.id!)} style={{ ...btnSecondary, padding: '6px 8px', color: '#ef4444', fontSize: 12 }}>×</button>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvel'} article</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...input, flex: 1 }} placeholder="Brief IA (sujet, longueur, ton)"
                value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} />
              <AiButton orgSlug={orgSlug} feature="text" label="✨ Rédiger"
                systemPrompt={'Tu es un rédacteur SEO. Format JSON strict : {"title":"...","excerpt":"...","bodyHtml":"<h2>...</h2><p>...</p>"}'}
                promptBuilder={() => aiBrief.trim() || null}
                onResult={(text) => {
                  try {
                    const j = JSON.parse((text.match(/\{[\s\S]+\}/) || [text])[0]);
                    setEditing({ ...editing, title: j.title || editing.title, excerpt: j.excerpt, bodyHtml: j.bodyHtml });
                  } catch { setEditing({ ...editing, bodyHtml: text }); }
                }} />
            </div>

            <Field label="Titre *"><input style={input} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Extrait"><textarea style={{ ...input, minHeight: 60 }} value={editing.excerpt || ''} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></Field>
            <Field label="Image de couverture (URL)">
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={input} value={editing.coverImage || ''} onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })} placeholder="https://..." />
                <button type="button"
                  onClick={async () => {
                    const prompt = window.prompt('Décris l\'image (style, sujet)', editing.title || '');
                    if (!prompt) return;
                    const r = await fetch(`/api/orgs/${orgSlug}/ai/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, aspectRatio: '16:9' }) });
                    const j = await r.json();
                    if (j.images?.[0]) setEditing({ ...editing, coverImage: j.images[0].url || j.images[0] });
                    else alert('Erreur : ' + (j.error || 'inconnu'));
                  }}
                  style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>🎨 IA</button>
              </div>
            </Field>
            <Field label="Corps HTML">
              <textarea style={{ ...input, minHeight: 240, fontFamily: 'monospace', fontSize: 12 }}
                value={editing.bodyHtml || ''} onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })} />
            </Field>
            <Field label="Tags (virgule)">
              <input style={input} value={(editing.tags || []).join(', ')}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
            <Field label="Statut">
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option>
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
