'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';
import { colors } from '@/lib/design-tokens';

type Page = {
  id?: string; slug?: string; title: string; bodyHtml?: string;
  status: 'draft' | 'published'; position?: number; parentId?: string | null;
  meta?: { description?: string; ogImage?: string }; createdAt?: string;
};

export function RichPagesClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);
  const [aiBrief, setAiBrief] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/rich-pages`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    if (editing.id) {
      await fetch(`/api/orgs/${orgSlug}/rich-pages/${editing.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/rich-pages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing),
      });
    }
    setEditing(null); load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette page ?')) return;
    await fetch(`/api/orgs/${orgSlug}/rich-pages/${id}`, { method: 'DELETE' });
    load();
  }

  // hiérarchie : pages racines + enfants par parentId
  const tree = useMemo(() => {
    const roots = items.filter((p) => !p.parentId);
    const byParent = items.reduce<Record<string, Page[]>>((acc, p) => { if (p.parentId) (acc[p.parentId] ||= []).push(p); return acc; }, {});
    return { roots, byParent };
  }, [items]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="📄" title="Pages riches"
      desc="Pages marketing au niveau org : about, contact, mentions légales, FAQ. Hiérarchie supportée."
      actions={<button style={btnPrimary} onClick={() => setEditing({ title: '', bodyHtml: '', status: 'draft' })}>+ Page</button>}>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : tree.roots.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>📄</div>
          <p style={{ opacity: 0.6 }}>Aucune page.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {tree.roots.map((p) => <PageRow key={p.id} p={p} depth={0} byParent={tree.byParent} onEdit={setEditing} onRemove={remove} />)}
        </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{editing.id ? 'Éditer' : 'Nouvelle'} page</h3>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input style={{ ...input, flex: 1 }} placeholder="Brief IA (mentions légales, about, contact…)"
                value={aiBrief} onChange={(e) => setAiBrief(e.target.value)} />
              <AiButton orgSlug={orgSlug} feature="text" label="✨ Rédiger"
                systemPrompt={'Tu rédiges une page marketing pro. Format JSON : {"title":"...","bodyHtml":"<h1>...</h1><p>...</p>","metaDescription":"..."}'}
                promptBuilder={() => aiBrief.trim() || null}
                onResult={(text) => {
                  try {
                    const j = JSON.parse((text.match(/\{[\s\S]+\}/) || [text])[0]);
                    setEditing({ ...editing, title: j.title || editing.title, bodyHtml: j.bodyHtml, meta: { ...editing.meta, description: j.metaDescription } });
                  } catch { setEditing({ ...editing, bodyHtml: text }); }
                }} />
            </div>

            <Field label="Titre *"><input style={input} value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
            <Field label="Slug (auto si vide)"><input style={input} value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="about" /></Field>
            <Field label="Meta description">
              <input style={input} value={editing.meta?.description || ''} onChange={(e) => setEditing({ ...editing, meta: { ...editing.meta, description: e.target.value } })} />
            </Field>
            <Field label="Page parente (id, optionnel)">
              <select style={input} value={editing.parentId || ''} onChange={(e) => setEditing({ ...editing, parentId: e.target.value || null })}>
                <option value="">— Aucune (racine)</option>
                {items.filter((p) => p.id !== editing.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Field>
            <Field label="Corps HTML">
              <textarea style={{ ...input, minHeight: 240, fontFamily: 'monospace', fontSize: 12 }}
                value={editing.bodyHtml || ''} onChange={(e) => setEditing({ ...editing, bodyHtml: e.target.value })} />
            </Field>
            <Field label="Position">
              <input type="number" style={input} value={editing.position || 0} onChange={(e) => setEditing({ ...editing, position: parseInt(e.target.value || '0', 10) })} />
            </Field>
            <Field label="Statut">
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                <option value="draft">Brouillon</option><option value="published">Publié</option>
              </select>
            </Field>

            <details style={{ marginBottom: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, opacity: 0.7 }}>👁️ Prévisualiser</summary>
              <div style={{ marginTop: 8, background: 'white', color: 'black', borderRadius: 8, padding: 16 }}
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

function PageRow({ p, depth, byParent, onEdit, onRemove }: { p: Page; depth: number; byParent: Record<string, Page[]>; onEdit: (p: Page) => void; onRemove: (id: string) => void }) {
  const children = byParent[p.id!] || [];
  return (
    <>
      <article style={{ ...card, padding: 12, display: 'flex', gap: 12, alignItems: 'center', marginLeft: depth * 24 }}>
        <div style={{ fontSize: 20 }}>{depth > 0 ? '↳' : '📄'}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{p.title}</div>
          <div style={{ fontSize: 11, opacity: 0.5 }}>/{p.slug} · <span style={pill(p.status === 'published' ? colors.success : '#a1a1aa')}>{p.status}</span></div>
        </div>
        <button onClick={() => onEdit(p)} style={{ ...btnSecondary, padding: '6px 12px', fontSize: 12 }}>Éditer</button>
        <button onClick={() => onRemove(p.id!)} style={{ ...btnSecondary, padding: '6px 8px', color: '#ef4444', fontSize: 12 }}>×</button>
      </article>
      {children.map((c) => <PageRow key={c.id} p={c} depth={depth + 1} byParent={byParent} onEdit={onEdit} onRemove={onRemove} />)}
    </>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
function pill(color: string): React.CSSProperties {
  return { background: `${color}22`, color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
}
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' };
