import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ProductsAdmin } from '@/components/admin/ProductsAdmin';
import {
  ShoppingBag, TrendingUp, Package, AlertTriangle, Truck, Settings as SettingsIcon, ExternalLink
} from 'lucide-react';

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default async function AdminShopPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    products, ordersCount, ordersMonth, revenue, paidOrders, pendingOrders, shippedOrders,
    dropshipProducts, lowStockProducts
  ] = await Promise.all([
    prisma.product.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
    prisma.order.count().catch(() => 0),
    prisma.order.count({ where: { createdAt: { gte: monthAgo } } }).catch(() => 0),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: ['PAID', 'SHIPPED'] } } }).catch(() => ({ _sum: { totalCents: 0 } })),
    prisma.order.count({ where: { status: 'PAID' } }).catch(() => 0),
    prisma.order.count({ where: { status: 'PENDING' } }).catch(() => 0),
    prisma.order.count({ where: { status: 'SHIPPED' } }).catch(() => 0),
    prisma.product.count({ where: { dropProvider: { not: null } } }).catch(() => 0),
    prisma.product.count({ where: { stock: { lte: 5, gt: 0 } } }).catch(() => 0)
  ]);

  const totalRevenue = (revenue as any)?._sum?.totalCents || 0;

  // Calcul marge totale (somme produit*qty pour les commandes payées)
  const paidOrdersWithItems = await prisma.order.findMany({
    where: { status: { in: ['PAID', 'SHIPPED'] } },
    include: { items: { include: { product: true } } }
  }).catch(() => []);

  let totalMarginCents = 0;
  for (const o of paidOrdersWithItems) {
    for (const it of o.items) {
      const cost = (it.product as any).costCents || 0;
      const margin = (it.priceCents - cost) * it.quantity;
      totalMarginCents += margin;
    }
  }

  const stats = [
    { label: 'Chiffre d\'affaires', value: fmt(totalRevenue), icon: TrendingUp, gradient: 'from-emerald-500 to-green-500', sub: `${ordersCount} commande${ordersCount > 1 ? 's' : ''}` },
    { label: 'Marge totale', value: fmt(totalMarginCents), icon: Package, gradient: 'from-pink-500 to-rose-500', sub: totalRevenue > 0 ? `${Math.round((totalMarginCents / totalRevenue) * 100)}% net` : '—' },
    { label: 'Commandes 30j', value: ordersMonth, icon: ShoppingBag, gradient: 'from-cyan-500 to-blue-500', sub: `${shippedOrders} expédiées` },
    { label: 'Produits actifs', value: products.filter((p) => p.published).length, icon: Package, gradient: 'from-violet-500 to-purple-500', sub: `${products.length} au total` },
    { label: 'Dropshipping', value: dropshipProducts, icon: Truck, gradient: 'from-amber-500 to-orange-500', sub: 'produits POD' }
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* HEADER avec actions */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl p-2.5">
              <ShoppingBag size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold">Boutique</h1>
          </div>
          <p className="text-zinc-400 text-sm">Gère tes produits, vois tes ventes et marges en temps réel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/shop/orders" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-pink/40 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <ShoppingBag size={14} /> Commandes ({ordersCount})
            {pendingOrders > 0 && <span className="bg-amber-500 text-black text-[10px] font-bold rounded-full px-2 py-0.5">{pendingOrders} à traiter</span>}
          </Link>
          <Link href="/admin/settings" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <SettingsIcon size={14} /> Paramètres
          </Link>
          <Link href="/boutique" target="_blank" className="bg-brand-pink hover:bg-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <ExternalLink size={14} /> Voir le site
          </Link>
        </div>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => {
          const I = s.icon;
          return (
            <div key={s.label} className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${s.gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition`}>
              <I size={20} className="opacity-90 mb-2" />
              <div className="text-2xl md:text-3xl font-bold leading-none mb-1">{s.value}</div>
              <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{s.label}</div>
              {s.sub && <div className="text-[10px] opacity-75 mt-1">{s.sub}</div>}
            </div>
          );
        })}
      </section>

      {/* ALERT bandeau si lowstock ou pending */}
      {(lowStockProducts > 0 || pendingOrders > 0) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-200">À traiter en priorité</p>
            <p className="text-xs text-amber-300/80">
              {pendingOrders > 0 && `${pendingOrders} commande${pendingOrders > 1 ? 's' : ''} en attente de paiement. `}
              {lowStockProducts > 0 && `${lowStockProducts} produit${lowStockProducts > 1 ? 's' : ''} en stock faible (≤5).`}
            </p>
          </div>
          {pendingOrders > 0 && <Link href="/admin/shop/orders" className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-2 rounded-full text-xs">Voir les commandes</Link>}
        </div>
      )}

      {/* PRODUITS */}
      <ProductsAdmin initialItems={products as any} />
    </div>
  );
}
