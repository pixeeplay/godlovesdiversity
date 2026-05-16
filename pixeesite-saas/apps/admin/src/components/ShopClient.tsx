'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients, statGradients } from '@/lib/design-tokens';

/**
 * ShopClient — iso GLD : stats, produits, commandes, variants, reviews,
 * wishlist, loyalty, dropship, settings.
 *
 * Multi-tenant via /api/orgs/[slug]/*.
 */
type Tab = 'products' | 'orders' | 'variants' | 'reviews' | 'wishlist' | 'loyalty' | 'dropship' | 'settings';

interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  priceCents: number;
  currency: string;
  images: string[];
  inventory: number;
  category?: string;
  active?: boolean;
  featured?: boolean;
  createdAt?: string;
}

interface Order {
  id: string;
  email?: string;
  customerEmail?: string;
  totalCents?: number;
  amountCents?: number;
  currency: string;
  status: string;
  items?: any[];
  createdAt: string;
}

function fmtPrice(cents: number, currency = 'EUR') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format((cents || 0) / 100);
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency}`;
  }
}

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'products', label: 'Produits', emoji: '📦' },
  { id: 'orders', label: 'Commandes', emoji: '🧾' },
  { id: 'variants', label: 'Variants', emoji: '🎨' },
  { id: 'reviews', label: 'Avis', emoji: '⭐' },
  { id: 'wishlist', label: 'Wishlist', emoji: '❤️' },
  { id: 'loyalty', label: 'Fidélité', emoji: '🏆' },
  { id: 'dropship', label: 'Dropship', emoji: '📥' },
  { id: 'settings', label: 'Réglages', emoji: '⚙️' },
];

export function ShopClient({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [filters, setFilters] = useState({ status: 'all', category: 'all', stockLow: false, featured: false, search: '' });

  async function load() {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        fetch(`/api/orgs/${orgSlug}/products`).then((r) => r.json()).catch(() => ({ items: [] })),
        fetch(`/api/orgs/${orgSlug}/orders`).then((r) => r.json()).catch(() => ({ items: [] })),
      ]);
      setProducts(p.items || []);
      setOrders(o.items || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Stats : CA total, panier moyen, conv, ventes par jour
  const stats = useMemo(() => {
    const paid = orders.filter((o) => ['paid', 'shipped', 'delivered'].includes(o.status));
    const totalCents = paid.reduce((s, o) => s + (o.totalCents || o.amountCents || 0), 0);
    const avg = paid.length ? Math.round(totalCents / paid.length) : 0;
    const visitors = paid.length * 25; // proxy estimé
    const conv = visitors ? ((paid.length / visitors) * 100) : 0;
    // ventes derniers 30 jours
    const now = Date.now();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86400000);
      const key = d.toISOString().slice(0, 10);
      const sum = paid.filter((o) => o.createdAt?.slice(0, 10) === key).reduce((s, o) => s + (o.totalCents || o.amountCents || 0), 0);
      return { day: key.slice(5), cents: sum };
    });
    return { totalCents, avg, conv, paid: paid.length, days, pending: orders.filter((o) => o.status === 'pending').length, active: products.filter((p) => p.active !== false).length, lowStock: products.filter((p) => (p.inventory ?? 0) > 0 && (p.inventory ?? 0) <= 5).length };
  }, [orders, products]);

  // Filtrage produits
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.status === 'active' && p.active === false) return false;
      if (filters.status === 'inactive' && p.active !== false) return false;
      if (filters.category !== 'all' && p.category !== filters.category) return false;
      if (filters.stockLow && (p.inventory ?? 0) > 5) return false;
      if (filters.featured && !p.featured) return false;
      if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [products, filters]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  async function bulkDelete() {
    if (!selection.length) return;
    if (!confirm(`Supprimer ${selection.length} produit(s) ?`)) return;
    const r = await fetch(`/api/orgs/${orgSlug}/products/bulk-delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selection }),
    });
    if (r.ok) {
      setSelection([]);
      load();
    } else {
      alert('Erreur bulk delete');
    }
  }
  async function bulkChangeCategory() {
    const cat = prompt('Nouvelle catégorie pour ' + selection.length + ' produit(s) :');
    if (!cat) return;
    const r = await fetch(`/api/orgs/${orgSlug}/products/bulk-edit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selection, patch: { category: cat } }),
    });
    if (r.ok) { setSelection([]); load(); }
  }
  async function duplicateProduct(id: string) {
    const r = await fetch(`/api/orgs/${orgSlug}/products/duplicate/${id}`, { method: 'POST' });
    if (r.ok) load();
    else alert('Erreur duplication');
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🛒" title="Boutique"
      desc="Vends en ligne — produits, paiements, commandes, fidélité"
      actions={
        <>
          {tab === 'products' && (
            <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Produit</button>
          )}
        </>
      }
    >
      {/* STATS */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 18 }}>
        <StatCard gradient={statGradients[0]} icon="💰" label="CA total" value={fmtPrice(stats.totalCents)} sub={`${stats.paid} commandes payées`} />
        <StatCard gradient={statGradients[1]} icon="🛒" label="Panier moyen" value={fmtPrice(stats.avg)} sub={stats.paid ? 'sur payées' : '—'} />
        <StatCard gradient={statGradients[2]} icon="📈" label="Conversion" value={`${stats.conv.toFixed(1)}%`} sub="estimé" />
        <StatCard gradient={statGradients[3]} icon="📦" label="Produits actifs" value={stats.active} sub={`${products.length} total`} />
        <StatCard gradient={statGradients[4]} icon="⚠️" label="Stock faible" value={stats.lowStock} sub="≤ 5 unités" />
        <StatCard gradient={statGradients[5]} icon="⏳" label="À traiter" value={stats.pending} sub="commandes" />
      </section>

      {/* Mini sparkline 7j */}
      {stats.days.some((d) => d.cents > 0) && (
        <div style={{ ...card, marginBottom: 18, padding: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Ventes 7 derniers jours</div>
          <Sparkline data={stats.days} />
        </div>
      )}

      {/* TABS */}
      <div role="tablist" aria-label="Sections boutique" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `1px solid ${colors.border}`, overflowX: 'auto' }}>
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={tab === t.id}
            onClick={() => { setTab(t.id); setSelection([]); }}
            style={{
              background: 'none', border: 0, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              color: tab === t.id ? colors.primary : colors.textMuted,
              borderBottom: tab === t.id ? `2px solid ${colors.primary}` : '2px solid transparent',
              fontWeight: 600, fontSize: 13,
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ opacity: 0.5 }}>Chargement…</p>
      ) : (
        <>
          {tab === 'products' && (
            <ProductsTab
              orgSlug={orgSlug}
              products={filteredProducts}
              allCategories={categories}
              filters={filters} setFilters={setFilters}
              selection={selection} setSelection={setSelection}
              onEdit={setEditing}
              onDuplicate={duplicateProduct}
              onBulkDelete={bulkDelete}
              onBulkChangeCategory={bulkChangeCategory}
              onShowNew={() => setShowNew(true)}
              reload={load}
            />
          )}
          {tab === 'orders' && <OrdersTab orgSlug={orgSlug} orders={orders} reload={load} />}
          {tab === 'variants' && <VariantsTab orgSlug={orgSlug} products={products} reload={load} />}
          {tab === 'reviews' && <ReviewsTab orgSlug={orgSlug} products={products} />}
          {tab === 'wishlist' && <WishlistTab orgSlug={orgSlug} products={products} />}
          {tab === 'loyalty' && <LoyaltyTab orgSlug={orgSlug} />}
          {tab === 'dropship' && <DropshipTab orgSlug={orgSlug} />}
          {tab === 'settings' && <SettingsTab orgSlug={orgSlug} />}
        </>
      )}

      {showNew && (
        <ProductModal
          orgSlug={orgSlug}
          initial={null}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); }}
        />
      )}
      {editing && (
        <ProductModal
          orgSlug={orgSlug}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </SimpleOrgPage>
  );
}

/* ─── Stat card ─────────────────────────────────────────────── */
function StatCard({ gradient, icon, label, value, sub }: { gradient: string; icon: string; label: string; value: any; sub?: string }) {
  return (
    <div style={{ background: gradient, color: 'white', padding: 14, borderRadius: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden', minHeight: 100, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 18, opacity: 0.9 }}>{icon}</span>
      <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95, marginTop: 'auto' }}>{label}</span>
      {sub && <span style={{ fontSize: 10, opacity: 0.8 }}>{sub}</span>}
    </div>
  );
}

/* ─── Sparkline ─────────────────────────────────────────────── */
function Sparkline({ data }: { data: { day: string; cents: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.cents));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
      {data.map((d) => (
        <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: '80%', height: `${(d.cents / max) * 50 + 4}px`, background: gradients.brand, borderRadius: 4, transition: 'height .3s' }} title={fmtPrice(d.cents)} />
          <span style={{ fontSize: 9, opacity: 0.5 }}>{d.day}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Products tab ──────────────────────────────────────────── */
function ProductsTab({ orgSlug, products, allCategories, filters, setFilters, selection, setSelection, onEdit, onDuplicate, onBulkDelete, onBulkChangeCategory, onShowNew, reload }: any) {
  function toggleSelect(id: string) {
    setSelection((s: string[]) => s.includes(id) ? s.filter((x: string) => x !== id) : [...s, id]);
  }
  function toggleSelectAll() {
    if (selection.length === products.length) setSelection([]);
    else setSelection(products.map((p: Product) => p.id));
  }
  return (
    <>
      {/* Filtres */}
      <div style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="🔎 Rechercher…"
          aria-label="Rechercher un produit"
          style={{ ...input, width: 200 }}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={{ ...input, width: 'auto' }} aria-label="Statut">
          <option value="all">Tous statuts</option>
          <option value="active">Actifs</option>
          <option value="inactive">Inactifs</option>
        </select>
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} style={{ ...input, width: 'auto' }} aria-label="Catégorie">
          <option value="all">Toutes catégories</option>
          {allCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={filters.stockLow} onChange={(e) => setFilters({ ...filters, stockLow: e.target.checked })} /> Stock faible
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <input type="checkbox" checked={filters.featured} onChange={(e) => setFilters({ ...filters, featured: e.target.checked })} /> En vedette
        </label>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <input type="checkbox" checked={selection.length === products.length && products.length > 0} onChange={toggleSelectAll} /> Tout sélectionner
          </label>
          {selection.length > 0 && (
            <>
              <span style={{ fontSize: 12, color: colors.textMuted }}>{selection.length} sélectionné(s)</span>
              <button onClick={onBulkChangeCategory} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 12 }}>Changer catégorie</button>
              <button onClick={onBulkDelete} style={{ background: colors.danger, color: 'white', border: 0, padding: '6px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
            </>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
          <p style={{ opacity: 0.6, margin: '0 0 16px' }}>Aucun produit pour le moment.</p>
          <button style={btnPrimary} onClick={onShowNew}>+ Premier produit</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {products.map((p: Product) => {
            const selected = selection.includes(p.id);
            return (
              <article key={p.id} style={{ ...card, padding: 12, position: 'relative', border: selected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}` }}>
                <input
                  type="checkbox" checked={selected} onChange={() => toggleSelect(p.id)}
                  aria-label={`Sélectionner ${p.name}`}
                  style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, accentColor: colors.primary }}
                />
                <div style={{ aspectRatio: '4/3', background: '#0a0a0f', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 2 }}>{fmtPrice(p.priceCents, p.currency)}</div>
                <div style={{ fontSize: 11, opacity: 0.5, display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Stock: {p.inventory ?? 0}</span>
                  {p.category && <span>{p.category}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => onEdit(p)} style={{ flex: 1, ...btnSecondary, padding: '6px 8px', fontSize: 11 }}>✏️ Éditer</button>
                  <button onClick={() => onDuplicate(p.id)} title="Dupliquer" style={{ ...btnSecondary, padding: '6px 8px', fontSize: 11 }}>📋</button>
                  <button onClick={async () => { if (!confirm('Supprimer ce produit ?')) return; await fetch(`/api/orgs/${orgSlug}/products?id=${p.id}`, { method: 'DELETE' }); reload(); }}
                    title="Supprimer" style={{ background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}44`, padding: '6px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>🗑</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ─── Orders tab ────────────────────────────────────────────── */
function OrdersTab({ orgSlug, orders }: { orgSlug: string; orders: Order[]; reload: () => void }) {
  if (orders.length === 0) return <p style={{ opacity: 0.5, textAlign: 'center', padding: 48 }}>Aucune commande pour le moment</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {orders.map((o) => (
        <article key={o.id} style={{ ...card, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 600 }}>{o.email || o.customerEmail || '—'}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>
                {new Date(o.createdAt).toLocaleString('fr-FR')} · {o.items?.length || 0} article(s)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: o.status === 'paid' || o.status === 'shipped' ? colors.success : colors.warning }}>
                {fmtPrice(o.totalCents || o.amountCents || 0, o.currency)}
              </div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>{o.status}</div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/* ─── Variants tab ──────────────────────────────────────────── */
function VariantsTab({ orgSlug, products, reload }: { orgSlug: string; products: Product[]; reload: () => void }) {
  const [variants, setVariants] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadVariants(productId: string) {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/variants?productId=${productId}`);
      const j = await r.json();
      setVariants((v) => ({ ...v, [productId]: j.items || [] }));
    } catch { /* noop */ }
  }

  async function addVariant(productId: string) {
    const name = prompt('Nom du variant (ex: Rouge / M) :');
    if (!name) return;
    const sku = prompt('SKU (optionnel) :') || '';
    const priceCents = parseInt(prompt('Prix en centimes (ou vide = hérite) :') || '0', 10) || null;
    const stock = parseInt(prompt('Stock :') || '0', 10);
    const r = await fetch(`/api/orgs/${orgSlug}/variants`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, name, sku, priceCents, stock, options: { name } }),
    });
    if (r.ok) loadVariants(productId);
  }
  async function deleteVariant(productId: string, id: string) {
    if (!confirm('Supprimer ce variant ?')) return;
    await fetch(`/api/orgs/${orgSlug}/variants?id=${id}`, { method: 'DELETE' });
    loadVariants(productId);
  }

  if (products.length === 0) return <p style={{ opacity: 0.5, padding: 24 }}>Crée des produits d'abord pour gérer leurs variants.</p>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {products.map((p) => {
        const open = expanded === p.id;
        const vs = variants[p.id] || [];
        return (
          <article key={p.id} style={card}>
            <button
              onClick={() => { setExpanded(open ? null : p.id); if (!open) loadVariants(p.id); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
              aria-expanded={open}
            >
              <span style={{ fontSize: 18 }}>{open ? '▼' : '▶'}</span>
              <strong style={{ flex: 1 }}>{p.name}</strong>
              <span style={{ fontSize: 11, opacity: 0.6 }}>{vs.length} variant(s)</span>
            </button>
            {open && (
              <div style={{ marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#0a0a0f' }}>
                      <th style={th}>Variant</th>
                      <th style={th}>SKU</th>
                      <th style={th}>Prix</th>
                      <th style={th}>Stock</th>
                      <th style={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {vs.map((v) => (
                      <tr key={v.id}>
                        <td style={td}>{v.name}</td>
                        <td style={td}>{v.sku || '—'}</td>
                        <td style={td}>{v.priceCents != null ? fmtPrice(v.priceCents, p.currency) : 'hérite'}</td>
                        <td style={td}>{v.stock ?? '—'}</td>
                        <td style={td}><button onClick={() => deleteVariant(p.id, v.id)} style={{ background: 'transparent', color: colors.danger, border: 0, cursor: 'pointer' }}>🗑</button></td>
                      </tr>
                    ))}
                    {vs.length === 0 && (
                      <tr><td colSpan={5} style={{ ...td, opacity: 0.5 }}>Aucun variant. Ajoute-en avec le bouton ci-dessous.</td></tr>
                    )}
                  </tbody>
                </table>
                <button onClick={() => addVariant(p.id)} style={{ ...btnSecondary, marginTop: 8, fontSize: 12 }}>+ Variant</button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
const th: React.CSSProperties = { textAlign: 'left', padding: 8, fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, borderBottom: `1px solid ${colors.border}` };
const td: React.CSSProperties = { padding: 8, borderBottom: `1px solid ${colors.border}` };

/* ─── Reviews tab ───────────────────────────────────────────── */
function ReviewsTab({ orgSlug, products }: { orgSlug: string; products: Product[] }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/reviews?status=${filter}`);
      const j = await r.json();
      setReviews(j.items || []);
    } catch { /* noop */ }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  async function moderate(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/orgs/${orgSlug}/reviews`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  // Distribution étoiles
  const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: reviews.filter((r) => r.rating === s).length }));
  const total = reviews.length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} style={{ ...input, width: 'auto' }} aria-label="Filtre statut">
          <option value="pending">En attente</option>
          <option value="approved">Approuvés</option>
          <option value="rejected">Rejetés</option>
          <option value="all">Tous</option>
        </select>
        <span style={{ opacity: 0.6, fontSize: 12 }}>{total} avis</span>
      </div>

      {total > 0 && (
        <div style={{ ...card, marginBottom: 12, padding: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>Distribution</div>
          {dist.map((d) => (
            <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 4 }}>
              <span style={{ width: 50 }}>{'⭐'.repeat(d.stars)}</span>
              <div style={{ flex: 1, height: 8, background: colors.bg, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: total ? `${(d.count / total) * 100}%` : 0, height: '100%', background: gradients.brand }} />
              </div>
              <span style={{ width: 30, textAlign: 'right', opacity: 0.6 }}>{d.count}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> :
        reviews.length === 0 ? <p style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>Aucun avis dans cette catégorie.</p> :
        <div style={{ display: 'grid', gap: 8 }}>
          {reviews.map((r) => {
            const prod = products.find((p) => p.id === r.productId);
            return (
              <article key={r.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong>{prod?.name || r.productId}</strong>
                  <span>{'⭐'.repeat(r.rating || 0)}</span>
                </div>
                {r.title && <div style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</div>}
                {r.content && <p style={{ margin: '4px 0 8px', fontSize: 13, opacity: 0.85 }}>{r.content}</p>}
                <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                  <span style={{ opacity: 0.5 }}>{new Date(r.createdAt).toLocaleString('fr-FR')}</span>
                  <span style={{ marginLeft: 'auto' }} />
                  {r.status !== 'approved' && <button onClick={() => moderate(r.id, 'approved')} style={{ background: colors.success, color: 'white', border: 0, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓ Approuver</button>}
                  {r.status !== 'rejected' && <button onClick={() => moderate(r.id, 'rejected')} style={{ background: colors.danger, color: 'white', border: 0, padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✕ Rejeter</button>}
                </div>
              </article>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ─── Wishlist tab ──────────────────────────────────────────── */
function WishlistTab({ orgSlug, products }: { orgSlug: string; products: Product[] }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/wishlists`).then((r) => r.json()).then((j) => setItems(j.items || [])).catch(() => {});
  }, [orgSlug]);

  // Agrégation : produit → count
  const agg = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.productId, (map.get(it.productId) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  return (
    <div>
      <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 12 }}>
        💡 Les wishlists indiquent quels produits intéressent tes leads → idéal pour relances marketing ciblées.
      </p>
      {agg.length === 0 ? <p style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>Aucune wishlist active.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {agg.map(([productId, count]) => {
            const p = products.find((x) => x.id === productId);
            return (
              <article key={productId} style={card}>
                <div style={{ fontSize: 22, fontWeight: 800, color: colors.pink }}>❤️ {count}</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{p?.name || productId}</div>
                {p && <div style={{ fontSize: 12, opacity: 0.6 }}>{fmtPrice(p.priceCents, p.currency)}</div>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Loyalty tab ───────────────────────────────────────────── */
function LoyaltyTab({ orgSlug }: { orgSlug: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/loyalty`).then((r) => r.json()).then((j) => setAccounts(j.items || [])).catch(() => {});
  }, [orgSlug]);

  const tiers = [
    { name: 'Bronze', min: 0, color: '#cd7f32' },
    { name: 'Silver', min: 500, color: '#c0c0c0' },
    { name: 'Gold', min: 2000, color: '#ffd700' },
    { name: 'Platinum', min: 5000, color: '#e5e4e2' },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {tiers.map((t) => {
          const count = accounts.filter((a) => (a.tier || '').toLowerCase() === t.name.toLowerCase()).length;
          return (
            <div key={t.name} style={{ ...card, padding: 12, borderTop: `3px solid ${t.color}` }}>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{count}</div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>≥ {t.min} pts</div>
            </div>
          );
        })}
      </div>
      {accounts.length === 0 ? <p style={{ opacity: 0.5, padding: 24, textAlign: 'center' }}>Aucun compte fidélité.</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: colors.bg }}>
              <th style={th}>User</th>
              <th style={th}>Tier</th>
              <th style={th}>Points</th>
              <th style={th}>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={td}>{a.userId}</td>
                <td style={td}>{a.tier}</td>
                <td style={td}>{a.points}</td>
                <td style={td}>{a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('fr-FR') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ─── Dropship tab ──────────────────────────────────────────── */
function DropshipTab({ orgSlug }: { orgSlug: string }) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <p style={{ margin: '0 0 12px' }}>📥 La gestion dropshipping a sa propre interface dédiée.</p>
      <a href={`/dashboard/orgs/${orgSlug}/dropshipping`} style={{ ...btnPrimary, display: 'inline-block' }}>Ouvrir Dropshipping →</a>
    </div>
  );
}

/* ─── Settings tab ──────────────────────────────────────────── */
function SettingsTab({ orgSlug }: { orgSlug: string }) {
  const [settings, setSettings] = useState<any>({
    currency: 'EUR', taxRate: 20, shippingFlatCents: 590, freeShippingThresholdCents: 6000,
    returnDays: 14, terms: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/products/settings`).then((r) => r.ok ? r.json() : null).then((j) => {
      if (j?.settings) setSettings({ ...settings, ...j.settings });
    }).catch(() => {});
    /* eslint-disable-next-line */
  }, []);

  async function save() {
    setSaving(true);
    await fetch(`/api/orgs/${orgSlug}/products/settings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
  }

  return (
    <div style={{ ...card, maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>Réglages boutique</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label>
          <div style={lblTxt}>Devise</div>
          <select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} style={input}>
            <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option><option>CAD</option>
          </select>
        </label>
        <label>
          <div style={lblTxt}>TVA (%)</div>
          <input type="number" value={settings.taxRate} onChange={(e) => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })} style={input} />
        </label>
        <label>
          <div style={lblTxt}>Livraison forfait (cts)</div>
          <input type="number" value={settings.shippingFlatCents} onChange={(e) => setSettings({ ...settings, shippingFlatCents: parseInt(e.target.value) || 0 })} style={input} />
        </label>
        <label>
          <div style={lblTxt}>Livraison gratuite ≥ (cts)</div>
          <input type="number" value={settings.freeShippingThresholdCents} onChange={(e) => setSettings({ ...settings, freeShippingThresholdCents: parseInt(e.target.value) || 0 })} style={input} />
        </label>
        <label>
          <div style={lblTxt}>Retours (jours)</div>
          <input type="number" value={settings.returnDays} onChange={(e) => setSettings({ ...settings, returnDays: parseInt(e.target.value) || 0 })} style={input} />
        </label>
      </div>
      <label style={{ display: 'block', marginTop: 12 }}>
        <div style={lblTxt}>Conditions générales de vente</div>
        <textarea value={settings.terms} onChange={(e) => setSettings({ ...settings, terms: e.target.value })} rows={6} style={input} />
      </label>
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button onClick={save} disabled={saving} style={btnPrimary}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
      </div>
    </div>
  );
}
const lblTxt: React.CSSProperties = { fontSize: 11, opacity: 0.6, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 };

/* ─── Product modal (création / édition) ────────────────────── */
function ProductModal({ orgSlug, initial, onClose, onSaved }: { orgSlug: string; initial: Product | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<any>(initial || { priceCents: 0, inventory: 0, currency: 'EUR', images: [] });
  const [saving, setSaving] = useState(false);

  function addImage() {
    const url = prompt('URL de l\'image :');
    if (!url) return;
    setDraft({ ...draft, images: [...(draft.images || []), url] });
  }
  function removeImage(i: number) {
    setDraft({ ...draft, images: (draft.images || []).filter((_: any, idx: number) => idx !== i) });
  }

  async function save() {
    setSaving(true);
    const url = `/api/orgs/${orgSlug}/products${initial ? `?id=${initial.id}` : ''}`;
    const method = initial ? 'PATCH' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    setSaving(false);
    if (r.ok) onSaved();
    else alert('Erreur sauvegarde');
  }

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={initial ? 'Éditer produit' : 'Nouveau produit'}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{initial ? 'Éditer le produit' : 'Nouveau produit'}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'transparent', color: colors.textMuted, border: 0, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <label style={{ display: 'block', marginBottom: 10 }}>
          <div style={lblTxt}>Nom *</div>
          <input style={input} value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label style={{ display: 'block', marginBottom: 10 }}>
          <div style={lblTxt}>Description</div>
          <textarea style={{ ...input, minHeight: 80 }} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          <label>
            <div style={lblTxt}>Prix (cts)</div>
            <input style={input} type="number" value={draft.priceCents || 0} onChange={(e) => setDraft({ ...draft, priceCents: parseInt(e.target.value || '0', 10) })} />
          </label>
          <label>
            <div style={lblTxt}>Devise</div>
            <select style={input} value={draft.currency || 'EUR'} onChange={(e) => setDraft({ ...draft, currency: e.target.value })}>
              <option>EUR</option><option>USD</option><option>GBP</option><option>CHF</option>
            </select>
          </label>
          <label>
            <div style={lblTxt}>Stock</div>
            <input style={input} type="number" value={draft.inventory || 0} onChange={(e) => setDraft({ ...draft, inventory: parseInt(e.target.value || '0', 10) })} />
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <label>
            <div style={lblTxt}>Catégorie</div>
            <input style={input} value={draft.category || ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
          </label>
          <label>
            <div style={lblTxt}>Slug URL</div>
            <input style={{ ...input, fontFamily: 'monospace' }} value={draft.slug || ''} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="auto" />
          </label>
        </div>

        {/* Images */}
        <div style={{ marginBottom: 10 }}>
          <div style={lblTxt}>Images</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {(draft.images || []).map((src: string, i: number) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={src} alt="" style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'cover', border: `1px solid ${colors.border}` }} />
                <button onClick={() => removeImage(i)} aria-label="Retirer image" style={{ position: 'absolute', top: -6, right: -6, background: colors.danger, color: 'white', border: 0, borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={addImage} style={{ ...btnSecondary, fontSize: 12 }}>+ Image (URL)</button>
        </div>

        {/* SEO */}
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: colors.textMuted }}>SEO & metadata</summary>
          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <div style={lblTxt}>SEO title</div>
              <input style={input} value={draft.seoTitle || ''} onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })} maxLength={70} />
            </label>
            <label style={{ display: 'block' }}>
              <div style={lblTxt}>SEO description</div>
              <textarea style={input} value={draft.seoDescription || ''} onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })} maxLength={180} rows={2} />
            </label>
          </div>
        </details>

        <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={draft.active !== false} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Actif
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <input type="checkbox" checked={!!draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> En vedette
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button style={btnSecondary} onClick={onClose}>Annuler</button>
          <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}</button>
        </div>
      </div>
    </div>
  );
}
