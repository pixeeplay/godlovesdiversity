'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Event = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt?: string | null;
  location?: string | null;
  category?: string | null;
  coverImage?: string | null;
  externalUrl?: string | null;
  published: boolean;
};

const CATEGORIES = ['Concert', 'Expo', 'Conférence', 'Atelier', 'Soirée', 'Sport', 'Autre'];

export function EventsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ published: true });

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    const r = await fetch(`/api/orgs/${orgSlug}/events?${qs.toString()}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!draft.title || !draft.startsAt) { alert('Titre et date de début requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!r.ok) { alert('Erreur création'); return; }
    setShowNew(false); setDraft({ published: true });
    load();
  }

  async function togglePublish(item: Event) {
    await fetch(`/api/orgs/${orgSlug}/events/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !item.published }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await fetch(`/api/orgs/${orgSlug}/events/${id}`, { method: 'DELETE' });
    load();
  }

  const stats = useMemo(() => {
    const now = Date.now();
    const upcoming = items.filter((e) => new Date(e.startsAt).getTime() >= now).length;
    const past = items.length - upcoming;
    const published = items.filter((e) => e.published).length;
    return { total: items.length, upcoming, past, published };
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📅" title="Événements"
      desc="Calendrier d'événements (concerts, expos, soirées). CRUD + publication."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouvel événement</button>}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="À venir" value={stats.upcoming} color={colors.success} />
        <Stat label="Passés" value={stats.past} color={colors.textMuted} />
        <Stat label="Publiés" value={stats.published} color={colors.primary} />
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={lbl}>Catégorie</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...input, padding: 8 }}>
              <option value="">Toutes</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Recherche (titre, lieu)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{ ...input, padding: 8 }} placeholder="festival, Paris…" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnPrimary} onClick={load}>Filtrer</button>
            <button style={btnSecondary} onClick={() => { setSearch(''); setCategory(''); setTimeout(load, 0); }}>Reset</button>
          </div>
        </div>
      </section>

      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouvel événement</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Titre *</label>
              <input style={input} value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Début *</label>
              <input type="datetime-local" style={input} value={draft.startsAt || ''} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Fin</label>
              <input type="datetime-local" style={input} value={draft.endsAt || ''} onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Lieu</label>
              <input style={input} value={draft.location || ''} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Catégorie</label>
              <select style={input} value={draft.category || ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                <option value="">—</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Description</label>
              <textarea style={{ ...input, minHeight: 80 }} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Image (URL)</label>
              <input style={input} value={draft.coverImage || ''} onChange={(e) => setDraft({ ...draft, coverImage: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Lien externe</label>
              <input style={input} value={draft.externalUrl || ''} onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })} />
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <p style={{ opacity: 0.6 }}>Aucun événement.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((ev) => (
            <div key={ev.id} style={{ ...card, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{ev.title}</strong>
                    {ev.category && <span style={pill}>{ev.category}</span>}
                    <span style={{ ...pill, background: ev.published ? '#10b98122' : '#ef444422', color: ev.published ? '#10b981' : '#ef4444' }}>
                      {ev.published ? 'publié' : 'brouillon'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {new Date(ev.startsAt).toLocaleString('fr-FR')}
                    {ev.location && <> · 📍 {ev.location}</>}
                  </div>
                </div>
                <button style={{ ...btnSecondary, padding: '6px 10px' }} onClick={() => togglePublish(ev)}>
                  {ev.published ? 'Dépublier' : 'Publier'}
                </button>
                <button style={{ ...btnSecondary, padding: '6px 10px', color: '#ef4444' }} onClick={() => remove(ev.id)}>Supprimer</button>
              </div>
            </div>
          ))}
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

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
