'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

export function ShopClient({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ priceCents: 0, inventory: 0, currency: 'EUR' });

  async function load() {
    setLoading(true);
    const [p, o] = await Promise.all([
      fetch(`/api/orgs/${orgSlug}/products`).then((r) => r.json()),
      fetch(`/api/orgs/${orgSlug}/orders`).then((r) => r.json()),
    ]);
    setProducts(p.items || []);
    setOrders(o.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createProduct() {
    const r = await fetch(`/api/orgs/${orgSlug}/products`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (r.ok) { setShowNew(false); setDraft({ priceCents: 0, inventory: 0, currency: 'EUR' }); load(); }
  }

  async function deleteProduct(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    await fetch(`/api/orgs/${orgSlug}/products?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🛒" title="Boutique"
      desc="Vends en ligne — produits, paiements Stripe, commandes"
      actions={tab === 'products' ? <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Produit</button> : undefined}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #27272a' }}>
        <button onClick={() => setTab('products')}
          style={{ background: 'none', border: 0, padding: '8px 12px', cursor: 'pointer',
            color: tab === 'products' ? '#d946ef' : '#a1a1aa', borderBottom: tab === 'products' ? '2px solid #d946ef' : 'none' }}
        >Produits ({products.length})</button>
        <button onClick={() => setTab('orders')}
          style={{ background: 'none', border: 0, padding: '8px 12px', cursor: 'pointer',
            color: tab === 'orders' ? '#d946ef' : '#a1a1aa', borderBottom: tab === 'orders' ? '2px solid #d946ef' : 'none' }}
        >Commandes ({orders.length})</button>
      </div>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : tab === 'products' ? (
        products.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
            <p style={{ opacity: 0.6, margin: '0 0 16px' }}>Aucun produit. Crée le premier !</p>
            <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Premier produit</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {products.map((p) => (
              <article key={p.id} style={card}>
                <div style={{ aspectRatio: '4/3', background: '#0a0a0f', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 13, opacity: 0.7, margin: '4px 0' }}>
                  {(p.priceCents / 100).toFixed(2)} {p.currency}
                </div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>Stock: {p.inventory}</div>
                <button onClick={() => deleteProduct(p.id)}
                  style={{ marginTop: 8, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}
                >Supprimer</button>
              </article>
            ))}
          </div>
        )
      ) : (
        orders.length === 0 ? (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: 48 }}>Aucune commande pour le moment</p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {orders.map((o) => (
              <article key={o.id} style={{ ...card, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{o.customerEmail}</div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>
                      {new Date(o.createdAt).toLocaleString('fr-FR')} · {o.items?.length || 0} article(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: o.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                      {(o.amountCents / 100).toFixed(2)} {o.currency}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{o.status}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Nouveau produit</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Nom *</div>
              <input style={input} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
              <textarea style={{ ...input, minHeight: 80 }} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Prix (cts)</div>
                <input style={input} type="number" value={draft.priceCents} onChange={(e) => setDraft({ ...draft, priceCents: parseInt(e.target.value || '0', 10) })} />
              </label>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Devise</div>
                <select style={input} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
                  <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option>
                </select>
              </label>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Stock</div>
                <input style={input} type="number" value={draft.inventory} onChange={(e) => setDraft({ ...draft, inventory: parseInt(e.target.value || '0', 10) })} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
              <button style={btnPrimary} onClick={createProduct}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
