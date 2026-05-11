'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Order = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  status: string;
  totalCents: number;
  refundedCents: number;
  currency: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  dropshipProvider?: string | null;
  createdAt: string;
  shippedAt?: string | null;
};

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'En attente',   bg: '#f59e0b22', color: '#f59e0b' },
  paid:      { label: 'Payée',        bg: '#06b6d422', color: '#06b6d4' },
  shipped:   { label: 'Expédiée',     bg: '#8b5cf622', color: '#8b5cf6' },
  delivered: { label: 'Livrée',       bg: '#10b98122', color: '#10b981' },
  refunded:  { label: 'Remboursée',   bg: '#71717a22', color: '#a1a1aa' },
  cancelled: { label: 'Annulée',      bg: '#ef444422', color: '#ef4444' },
};

function fmt(cents: number, ccy = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: ccy }).format((cents || 0) / 100);
}

export function OrdersClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres
  const [status, setStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (status)   qs.set('status', status);
    if (dateFrom) qs.set('dateFrom', dateFrom);
    if (dateTo)   qs.set('dateTo', dateTo);
    if (search)   qs.set('search', search);
    const r = await fetch(`/api/orgs/${orgSlug}/orders?${qs.toString()}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const stats = useMemo(() => {
    const revenue = items.filter((o) => ['paid', 'shipped', 'delivered'].includes(o.status))
      .reduce((s, o) => s + (o.totalCents || 0) - (o.refundedCents || 0), 0);
    const byStatus: Record<string, number> = {};
    for (const o of items) byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    return { revenue, byStatus, total: items.length };
  }, [items]);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="🧾"
      title="Commandes"
      desc="Toutes les commandes de ta boutique. Filtre, expédie, rembourse."
    >
      {/* Stats compactes */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>CA filtré</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: colors.success }}>{fmt(stats.revenue)}</div>
        </div>
        <div style={{ ...card, padding: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{stats.total}</div>
        </div>
        {Object.entries(stats.byStatus).map(([s, n]) => {
          const meta = STATUS_LABELS[s] || { label: s, bg: '#27272a', color: '#a1a1aa' };
          return (
            <div key={s} style={{ ...card, padding: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{meta.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{n}</div>
            </div>
          );
        })}
      </section>

      {/* Filtres */}
      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={lbl}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...input, padding: '8px' }}>
              <option value="">Tous</option>
              {Object.keys(STATUS_LABELS).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Depuis</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...input, padding: '8px' }} />
          </div>
          <div>
            <label style={lbl}>Jusqu'à</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...input, padding: '8px' }} />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={lbl}>Recherche (email, nom, id)</label>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="jean@…  ou Dupont  ou ckxa…"
              style={{ ...input, padding: '8px' }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnPrimary} onClick={load}>Filtrer</button>
            <button style={btnSecondary} onClick={() => { setStatus(''); setDateFrom(''); setDateTo(''); setSearch(''); setTimeout(load, 0); }}>Reset</button>
          </div>
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <p style={{ opacity: 0.5 }}>Chargement…</p>
      ) : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🧾</div>
          <p style={{ opacity: 0.6, margin: 0 }}>Aucune commande pour ces filtres.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {items.map((o) => {
            const meta = STATUS_LABELS[o.status] || { label: o.status, bg: '#27272a', color: '#a1a1aa' };
            const remaining = (o.totalCents || 0) - (o.refundedCents || 0);
            const name = `${o.firstName || ''} ${o.lastName || ''}`.trim();
            return (
              <Link key={o.id} href={`/dashboard/orgs/${orgSlug}/orders/${o.id}`}
                style={{ ...card, padding: 12, textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>#{o.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ background: meta.bg, color: meta.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>{meta.label}</span>
                      {o.dropshipProvider && (
                        <span style={{ background: '#10b98122', color: '#10b981', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                          ↗ {o.dropshipProvider}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13 }}>
                      {o.email} {name && <span style={{ opacity: 0.6 }}>· {name}</span>}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                      {new Date(o.createdAt).toLocaleString('fr-FR')}
                      {o.trackingNumber && <> · 📦 <span style={{ fontFamily: 'monospace' }}>{o.trackingNumber}</span></>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: colors.primary }}>{fmt(remaining, o.currency)}</div>
                    {o.refundedCents > 0 && (
                      <div style={{ fontSize: 10, opacity: 0.6 }}>remboursé {fmt(o.refundedCents, o.currency)}</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </SimpleOrgPage>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
