'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Coupon = {
  id: string; code: string; type: string; value: number;
  currency: string; minCents?: number | null; maxUses?: number | null;
  usedCount: number; validFrom?: string | null; validUntil?: string | null;
  active: boolean; notes?: string | null;
};

export function CouponsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ type: 'percent', value: 10, active: true, currency: 'EUR' });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/coupons`);
    const j = await r.json();
    setItems(j.items || []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft.code) { alert('Code requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/coupons`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert('Erreur: ' + (j.error || r.status)); return; }
    setShowNew(false); setDraft({ type: 'percent', value: 10, active: true, currency: 'EUR' });
    load();
  }

  async function toggle(it: Coupon) {
    await fetch(`/api/orgs/${orgSlug}/coupons/${it.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !it.active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce coupon ?')) return;
    await fetch(`/api/orgs/${orgSlug}/coupons/${id}`, { method: 'DELETE' });
    load();
  }

  const stats = useMemo(() => {
    const active = items.filter((c) => c.active).length;
    const used = items.reduce((s, c) => s + (c.usedCount || 0), 0);
    const exhausted = items.filter((c) => c.maxUses && c.usedCount >= c.maxUses).length;
    return { total: items.length, active, used, exhausted };
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🎟️" title="Coupons & promos"
      desc="Codes promo (% ou montant fixe), limites, dates de validité, suivi d'utilisation."
      actions={<button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouveau coupon</button>}
    >
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Actifs" value={stats.active} color={colors.success} />
        <Stat label="Utilisations" value={stats.used} color={colors.primary} />
        <Stat label="Épuisés" value={stats.exhausted} color={colors.warning} />
      </section>

      {showNew && (
        <div style={{ ...card, marginBottom: 16, background: '#0e0e14' }}>
          <h3 style={{ marginTop: 0 }}>Nouveau coupon</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={lbl}>Code *</label>
              <input style={{ ...input, textTransform: 'uppercase' }} value={draft.code || ''} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
            </div>
            <div>
              <label style={lbl}>Type</label>
              <select style={input} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="percent">% de remise</option>
                <option value="fixed">Montant fixe</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Valeur {draft.type === 'percent' ? '(%)' : '(cents)'}</label>
              <input type="number" style={input} value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
            </div>
            <div>
              <label style={lbl}>Min commande (cents)</label>
              <input type="number" style={input} value={draft.minCents || ''} onChange={(e) => setDraft({ ...draft, minCents: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Usages max</label>
              <input type="number" style={input} value={draft.maxUses || ''} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Devise</label>
              <input style={input} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Début</label>
              <input type="date" style={input} value={draft.validFrom || ''} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} />
            </div>
            <div>
              <label style={lbl}>Fin</label>
              <input type="date" style={input} value={draft.validUntil || ''} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} />
            </div>
            <div style={{ gridColumn: 'span 3' }}>
              <label style={lbl}>Notes</label>
              <input style={input} value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎟️</div>
          <p style={{ opacity: 0.6 }}>Aucun coupon.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((c) => {
            const pct = c.maxUses ? (c.usedCount / c.maxUses) * 100 : 0;
            const valLabel = c.type === 'percent' ? `${c.value} %` : `${(c.value / 100).toFixed(2)} ${c.currency}`;
            return (
              <div key={c.id} style={{ ...card, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: colors.primary }}>{c.code}</span>
                      <span style={pill}>-{valLabel}</span>
                      <span style={{ ...pill, background: c.active ? '#10b98122' : '#71717a22', color: c.active ? '#10b981' : '#a1a1aa' }}>
                        {c.active ? 'actif' : 'inactif'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                      {c.usedCount} utilisation{c.usedCount > 1 ? 's' : ''}
                      {c.maxUses && <> / {c.maxUses} (max)</>}
                      {c.validUntil && <> · jusqu'au {new Date(c.validUntil).toLocaleDateString('fr-FR')}</>}
                      {c.notes && <> · {c.notes}</>}
                    </div>
                    {c.maxUses && (
                      <div style={{ height: 4, background: '#27272a', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: pct >= 100 ? '#ef4444' : colors.primary }} />
                      </div>
                    )}
                  </div>
                  <button style={{ ...btnSecondary, padding: '6px 10px' }} onClick={() => toggle(c)}>
                    {c.active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button style={{ ...btnSecondary, padding: '6px 10px', color: '#ef4444' }} onClick={() => remove(c.id)}>Supprimer</button>
                </div>
              </div>
            );
          })}
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
const pill: React.CSSProperties = { background: '#27272a', color: '#a1a1aa', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' };
