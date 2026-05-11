'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Testimonial = {
  id: string; authorName: string; authorTitle?: string | null; authorAvatar?: string | null;
  videoUrl?: string | null; posterImage?: string | null; quote?: string | null;
  rating?: number | null; featured: boolean; published: boolean; position: number;
};

export function TestimonialsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ published: true, featured: false, rating: 5 });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/testimonials`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.authorName) { alert('Nom requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/testimonials`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!r.ok) { alert('Erreur création'); return; }
    setShowNew(false); setDraft({ published: true, featured: false, rating: 5 });
    load();
  }

  async function toggleField(t: Testimonial, field: 'featured' | 'published') {
    await fetch(`/api/orgs/${orgSlug}/testimonials/${t.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !t[field] }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce témoignage ?')) return;
    await fetch(`/api/orgs/${orgSlug}/testimonials/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🗣️" title="Témoignages"
      desc="Témoignages clients vidéo et citations. Mise en avant + publication."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouveau témoignage</button>}
    >
      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau témoignage</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>Nom *</label>
              <input style={input} value={draft.authorName || ''} onChange={(e) => setDraft({ ...draft, authorName: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Titre / fonction</label>
              <input style={input} value={draft.authorTitle || ''} onChange={(e) => setDraft({ ...draft, authorTitle: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Avatar (URL)</label>
              <input style={input} value={draft.authorAvatar || ''} onChange={(e) => setDraft({ ...draft, authorAvatar: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Vidéo (URL)</label>
              <input style={input} value={draft.videoUrl || ''} onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Poster (image preview)</label>
              <input style={input} value={draft.posterImage || ''} onChange={(e) => setDraft({ ...draft, posterImage: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Note (1-5)</label>
              <input type="number" min={1} max={5} style={input} value={draft.rating || 5} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Citation</label>
              <textarea style={{ ...input, minHeight: 80 }} value={draft.quote || ''} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={save}>Créer</button>
            <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗣️</div>
          <p style={{ opacity: 0.6 }}>Aucun témoignage.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {items.map((t) => (
            <div key={t.id} style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(t.posterImage || t.videoUrl) && (
                <div style={{ height: 140, background: '#0a0a0f', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  {t.posterImage
                    ? <img src={t.posterImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>🎥</div>}
                  {t.videoUrl && <span style={{ position: 'absolute', top: 8, right: 8, ...pill, background: '#0008', color: 'white' }}>▶ vidéo</span>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {t.authorAvatar && <img src={t.authorAvatar} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t.authorName}</div>
                  {t.authorTitle && <div style={{ fontSize: 11, opacity: 0.6 }}>{t.authorTitle}</div>}
                </div>
                {t.rating && <span style={{ color: '#f59e0b' }}>{'★'.repeat(t.rating)}</span>}
              </div>
              {t.quote && <p style={{ fontSize: 12, opacity: 0.85, margin: 0, fontStyle: 'italic' }}>"{t.quote.slice(0, 140)}{t.quote.length > 140 ? '…' : ''}"</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ ...pill, background: t.published ? '#10b98122' : '#71717a22', color: t.published ? '#10b981' : '#a1a1aa' }}>
                  {t.published ? 'publié' : 'brouillon'}
                </span>
                {t.featured && <span style={{ ...pill, background: colors.primary + '22', color: colors.primary }}>★ mis en avant</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 11 }} onClick={() => toggleField(t, 'published')}>
                  {t.published ? 'Dépublier' : 'Publier'}
                </button>
                <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 11 }} onClick={() => toggleField(t, 'featured')}>
                  {t.featured ? '☆ Retirer' : '★ Promouvoir'}
                </button>
                <button style={{ ...btnSecondary, padding: '5px 8px', fontSize: 11, color: '#ef4444' }} onClick={() => remove(t.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimpleOrgPage>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
