'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Order = any;

const STATUS_OPTIONS = ['pending', 'paid', 'shipped', 'delivered', 'refunded', 'cancelled'];
const CARRIERS = ['', 'colissimo', 'chronopost', 'dhl', 'ups', 'fedex', 'mondialrelay', 'boxtal', 'shippo'];

function fmt(cents: number, ccy = 'EUR') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: ccy }).format((cents || 0) / 100);
}

export function OrderDetailClient({ orgSlug, orderId }: { orgSlug: string; orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/orders/${orderId}`);
    if (r.ok) setOrder(await r.json());
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function patch(data: any) {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/orders/${orderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setOrder(j);
      setMsg({ kind: 'ok', text: 'Enregistré' });
    } catch (e: any) {
      setMsg({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function refund(amountCents?: number) {
    if (!confirm(amountCents ? `Rembourser ${(amountCents / 100).toFixed(2)} € ?` : 'Rembourser tout le restant ?')) return;
    setSaving(true); setMsg(null);
    const r = await fetch(`/api/orgs/${orgSlug}/orders/${orderId}/refund`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg({ kind: 'err', text: j?.error || 'Erreur' }); return; }
    setMsg({ kind: 'ok', text: `Remboursement OK (${j.refund.id})` });
    setOrder(j.order);
  }

  async function dropship(provider: string) {
    if (!confirm(`Transmettre cette commande à ${provider} ?`)) return;
    setSaving(true); setMsg(null);
    const r = await fetch(`/api/orgs/${orgSlug}/orders/${orderId}/dropship`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) { setMsg({ kind: 'err', text: j?.error || 'Erreur' }); return; }
    setMsg({ kind: 'ok', text: `Commande envoyée à ${provider}` });
    setOrder(j.order);
  }

  if (loading) return <SimpleOrgPage orgSlug={orgSlug} emoji="🧾" title="Commande" desc="Chargement…"><p>…</p></SimpleOrgPage>;
  if (!order) return <SimpleOrgPage orgSlug={orgSlug} emoji="🧾" title="Commande" desc="Introuvable"><p>Cette commande n'existe pas.</p></SimpleOrgPage>;

  const items: any[] = Array.isArray(order.items) ? order.items : [];
  const remaining = (order.totalCents || 0) - (order.refundedCents || 0);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="🧾"
      title={`#${order.id.slice(0, 8).toUpperCase()}`}
      desc={`${order.email} · ${new Date(order.createdAt).toLocaleString('fr-FR')}`}
      actions={<Link href={`/dashboard/orgs/${orgSlug}/orders`} style={btnSecondary as any}>← Toutes les commandes</Link>}
    >
      {msg && (
        <div style={{ ...card, marginBottom: 12, borderColor: msg.kind === 'ok' ? colors.success : colors.danger, padding: 10, fontSize: 13 }}>
          {msg.kind === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        {/* Articles */}
        <section style={card}>
          <h3 style={h3}>Articles</h3>
          {items.length === 0 ? <p style={{ opacity: 0.6 }}>Aucun article.</p> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              {items.map((it, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <span>{(it.qty || it.quantity || 1)} × {it.name || it.productId}</span>
                  <span style={{ fontWeight: 700 }}>{fmt((it.priceCents || 0) * (it.qty || it.quantity || 1), order.currency)}</span>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 12, display: 'grid', gap: 4, fontSize: 13 }}>
            <Row label="Sous-total" value={fmt(order.subtotalCents || 0, order.currency)} />
            <Row label="Livraison" value={fmt(order.shippingCents || 0, order.currency)} />
            <Row label="TVA" value={fmt(order.taxCents || 0, order.currency)} />
            <Row label="Total" value={fmt(order.totalCents || 0, order.currency)} bold />
            {order.refundedCents > 0 && <Row label="Remboursé" value={`- ${fmt(order.refundedCents, order.currency)}`} />}
            {order.refundedCents > 0 && <Row label="Restant" value={fmt(remaining, order.currency)} bold />}
          </div>
        </section>

        {/* Client */}
        <section style={card}>
          <h3 style={h3}>Client</h3>
          <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            <Row label="Email" value={order.email} />
            <Row label="Nom" value={`${order.firstName || ''} ${order.lastName || ''}`.trim() || '—'} />
            <Row label="Téléphone" value={order.phone || '—'} />
            <Row label="Adresse" value={[order.shipAddress, order.shipCity, order.shipPostal, order.shipCountry].filter(Boolean).join(' · ') || '—'} />
          </div>
        </section>

        {/* Statut + shipping */}
        <section style={card}>
          <h3 style={h3}>Expédition</h3>
          <label style={lbl}>Statut</label>
          <select value={order.status} onChange={(e) => patch({ status: e.target.value })}
            disabled={saving} style={{ ...input, padding: 8, marginBottom: 8 }}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label style={lbl}>Transporteur</label>
          <select value={order.carrier || ''} onChange={(e) => patch({ carrier: e.target.value || null })}
            disabled={saving} style={{ ...input, padding: 8, marginBottom: 8 }}>
            {CARRIERS.map((c) => <option key={c} value={c}>{c || '—'}</option>)}
          </select>

          <label style={lbl}>N° de suivi</label>
          <input value={order.trackingNumber || ''} disabled={saving}
            onBlur={(e) => { if (e.target.value !== (order.trackingNumber || '')) patch({ trackingNumber: e.target.value || null }); }}
            onChange={(e) => setOrder({ ...order, trackingNumber: e.target.value })}
            placeholder="ex: 8M00120304…"
            style={{ ...input, marginBottom: 8 }} />

          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: colors.info, textDecoration: 'underline' }}>
              ↗ Suivre le colis
            </a>
          )}

          <div style={{ marginTop: 12, display: 'grid', gap: 6, fontSize: 12 }}>
            {order.shippedAt   && <div>📦 Expédiée le {new Date(order.shippedAt).toLocaleString('fr-FR')}</div>}
            {order.deliveredAt && <div>✅ Livrée le {new Date(order.deliveredAt).toLocaleString('fr-FR')}</div>}
          </div>
        </section>

        {/* Actions */}
        <section style={card}>
          <h3 style={h3}>Actions</h3>

          {order.externalId && remaining > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Remboursement Stripe</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={btnPrimary} disabled={saving} onClick={() => refund()}>Rembourser tout ({fmt(remaining, order.currency)})</button>
                <button style={btnSecondary} disabled={saving} onClick={() => {
                  const v = prompt(`Montant en ${order.currency} (max ${(remaining/100).toFixed(2)}) :`);
                  if (!v) return;
                  const cents = Math.round(parseFloat(v.replace(',', '.')) * 100);
                  if (cents > 0 && cents <= remaining) refund(cents);
                }}>Partiel…</button>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Dropshipping</div>
            {order.dropshipProvider ? (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Envoyée à <strong>{order.dropshipProvider}</strong> · statut : {order.dropshipStatus || '—'}<br />
                ID : <span style={{ fontFamily: 'monospace' }}>{order.dropshipOrderId || '—'}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={btnSecondary} disabled={saving} onClick={() => dropship('aliexpress')}>→ AliExpress</button>
                <button style={btnSecondary} disabled={saving} onClick={() => dropship('spocket')}>→ Spocket</button>
                <button style={btnSecondary} disabled={saving} onClick={() => dropship('printful')}>→ Printful</button>
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>Notes internes</label>
            <textarea defaultValue={order.notes || ''}
              onBlur={(e) => { if (e.target.value !== (order.notes || '')) patch({ notes: e.target.value }); }}
              style={{ ...input, minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </section>
      </div>
    </SimpleOrgPage>
  );
}

const h3: React.CSSProperties = { margin: '0 0 12px', fontSize: 14, fontWeight: 700 };
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 500 }}>{value}</span>
    </div>
  );
}
