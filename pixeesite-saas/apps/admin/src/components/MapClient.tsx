'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Loc = {
  id: string; name: string; type?: string | null; address?: string | null;
  lat: number; lng: number; country?: string | null; city?: string | null;
  description?: string | null; featured: boolean; images: string[];
};

const TYPES = ['shop', 'office', 'venue', 'restaurant', 'hotel', 'monument', 'other'];

export function MapClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [type, setType] = useState('');
  const [country, setCountry] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<any>({ type: 'venue', featured: false });

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (type) qs.set('type', type);
    if (country) qs.set('country', country);
    if (search) qs.set('search', search);
    const r = await fetch(`/api/orgs/${orgSlug}/map?${qs.toString()}`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function save() {
    if (!draft.name || draft.lat == null || draft.lng == null) { alert('Nom, lat, lng requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/map`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!r.ok) { alert('Erreur'); return; }
    setShowNew(false); setDraft({ type: 'venue', featured: false });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce lieu ?')) return;
    await fetch(`/api/orgs/${orgSlug}/map/${id}`, { method: 'DELETE' });
    load();
  }

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    for (const l of items) {
      const t = l.type || 'other';
      byType[t] = (byType[t] || 0) + 1;
      const c = l.country || '—';
      byCountry[c] = (byCountry[c] || 0) + 1;
    }
    return { total: items.length, byType, countries: Object.keys(byCountry).length };
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🗺️" title="Carte des lieux"
      desc="Lieux géolocalisés avec lat/lng. Filtre par type, pays, ville."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouveau lieu</button>}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Pays" value={stats.countries} color={colors.primary} />
        {Object.entries(stats.byType).slice(0, 4).map(([t, n]) => (
          <Stat key={t} label={t} value={n} />
        ))}
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={lbl}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...input, padding: 8 }}>
              <option value="">Tous</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Pays</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...input, padding: 8 }} placeholder="FR, US…" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Recherche (nom, ville, adresse)</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              style={{ ...input, padding: 8 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnPrimary} onClick={load}>Filtrer</button>
            <button style={btnSecondary} onClick={() => { setType(''); setCountry(''); setSearch(''); setTimeout(load, 0); }}>Reset</button>
          </div>
        </div>
      </section>

      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau lieu</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={lbl}>Nom *</label>
              <input style={input} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select style={input} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Latitude *</label>
              <input type="number" step="any" style={input} value={draft.lat ?? ''} onChange={(e) => setDraft({ ...draft, lat: parseFloat(e.target.value) })} placeholder="48.8566" />
            </div>
            <div>
              <label style={lbl}>Longitude *</label>
              <input type="number" step="any" style={input} value={draft.lng ?? ''} onChange={(e) => setDraft({ ...draft, lng: parseFloat(e.target.value) })} placeholder="2.3522" />
            </div>
            <div>
              <label style={lbl}>Pays</label>
              <input style={input} value={draft.country || ''} onChange={(e) => setDraft({ ...draft, country: e.target.value })} placeholder="FR" />
            </div>
            <div>
              <label style={lbl}>Ville</label>
              <input style={input} value={draft.city || ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Adresse</label>
              <input style={input} value={draft.address || ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={lbl}>Description</label>
              <textarea style={{ ...input, minHeight: 60 }} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
          </div>
          {(draft.lat != null && draft.lng != null) && (
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 8 }}>
              📍 Preview: <a href={`https://www.openstreetmap.org/?mlat=${draft.lat}&mlon=${draft.lng}#map=15/${draft.lat}/${draft.lng}`} target="_blank" rel="noopener">OpenStreetMap</a>
            </div>
          )}
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <button style={btnPrimary} onClick={save}>Créer</button>
            <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p>
      : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ opacity: 0.6 }}>Aucun lieu.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((l) => (
            <div key={l.id} style={{ ...card, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 14 }}>{l.name}</strong>
                    {l.type && <span style={pill}>{l.type}</span>}
                    {l.featured && <span style={{ ...pill, background: colors.primary + '22', color: colors.primary }}>★</span>}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {l.city && <>{l.city}{l.country && `, ${l.country}`} · </>}
                    📍 <span style={{ fontFamily: 'monospace' }}>{l.lat.toFixed(4)}, {l.lng.toFixed(4)}</span>
                    {l.address && <> · {l.address}</>}
                  </div>
                </div>
                <a href={`https://www.openstreetmap.org/?mlat=${l.lat}&mlon=${l.lng}#map=15/${l.lat}/${l.lng}`} target="_blank" rel="noopener"
                  style={{ ...btnSecondary, padding: '6px 10px', fontSize: 12 }}>Voir</a>
                <button style={{ ...btnSecondary, padding: '6px 10px', color: '#ef4444' }} onClick={() => remove(l.id)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return <div style={{ ...card, padding: 12 }}>
    <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || 'inherit' }}>{value}</div>
  </div>;
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
