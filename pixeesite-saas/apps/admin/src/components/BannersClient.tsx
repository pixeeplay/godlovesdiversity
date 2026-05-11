'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Banner = {
  id: string; name: string; image?: string | null; link?: string | null;
  ctaLabel?: string | null; position: string; priority: number;
  startsAt?: string | null; endsAt?: string | null; active: boolean;
  targetPages: string[];
};

const POSITIONS = [
  { value: 'top', label: 'Top (above header)' },
  { value: 'hero', label: 'Hero (homepage)' },
  { value: 'inline', label: 'Inline (between sections)' },
  { value: 'bottom', label: 'Bottom (sticky bottom)' },
];

export function BannersClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ position: 'hero', priority: 0, active: true, targetPages: [] });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/banners`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.name) { alert('Nom requis'); return; }
    const targetPages = typeof draft.targetPagesRaw === 'string'
      ? draft.targetPagesRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : draft.targetPages || [];
    const r = await fetch(`/api/orgs/${orgSlug}/banners`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, targetPages }),
    });
    if (!r.ok) { alert('Erreur'); return; }
    setShowNew(false); setDraft({ position: 'hero', priority: 0, active: true, targetPages: [] });
    load();
  }

  async function toggle(b: Banner) {
    await fetch(`/api/orgs/${orgSlug}/banners/${b.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !b.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette bannière ?')) return;
    await fetch(`/api/orgs/${orgSlug}/banners/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🎯" title="Bannières"
      desc="Bannières du hero, top et inline. Programmation par date + ciblage par page."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouvelle bannière</button>}
    >
      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouvelle bannière</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Nom *</label>
              <input style={input} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Promo Q1, soldes été…" />
            </div>
            <div>
              <label style={lbl}>Position</label>
              <select style={input} value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })}>
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Priorité</label>
              <input type="number" style={input} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
            </div>
            <div>
              <label style={lbl}>Image (URL)</label>
              <input style={input} value={draft.image || ''} onChange={(e) => setDraft({ ...draft, image: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Lien</label>
              <input style={input} value={draft.link || ''} onChange={(e) => setDraft({ ...draft, link: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Label CTA</label>
              <input style={input} value={draft.ctaLabel || ''} onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })} placeholder="Découvrir" />
            </div>
            <div>
              <label style={lbl}>Pages ciblées (paths, séparés par virgule)</label>
              <input style={input} value={draft.targetPagesRaw || ''} onChange={(e) => setDraft({ ...draft, targetPagesRaw: e.target.value })} placeholder="/, /shop, /events" />
            </div>
            <div>
              <label style={lbl}>Début</label>
              <input type="date" style={input} value={draft.startsAt || ''} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Fin</label>
              <input type="date" style={input} value={draft.endsAt || ''} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
          <p style={{ opacity: 0.6 }}>Aucune bannière.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((b) => (
            <div key={b.id} style={{ ...card, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {b.image && <img src={b.image} alt="" style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 14 }}>{b.name}</strong>
                    <span style={pill}>{b.position}</span>
                    <span style={{ ...pill, background: b.active ? '#10b98122' : '#71717a22', color: b.active ? '#10b981' : '#a1a1aa' }}>
                      {b.active ? 'actif' : 'inactif'}
                    </span>
                    {b.priority > 0 && <span style={{ ...pill, background: colors.primary + '22', color: colors.primary }}>priorité {b.priority}</span>}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {b.link && <>→ {b.link}</>}
                    {b.ctaLabel && <> · "{b.ctaLabel}"</>}
                    {b.targetPages?.length > 0 && <> · pages: {b.targetPages.join(', ')}</>}
                  </div>
                </div>
                <button style={{ ...btnSecondary, padding: '6px 10px' }} onClick={() => toggle(b)}>
                  {b.active ? 'Désactiver' : 'Activer'}
                </button>
                <button style={{ ...btnSecondary, padding: '6px 10px', color: '#ef4444' }} onClick={() => remove(b.id)}>Supprimer</button>
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
