import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default async function OrdersPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: true } } },
    take: 100
  });

  return (
    <div className="p-8 max-w-6xl">
      <Link href="/admin/shop" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 text-sm">
        <ArrowLeft size={16} /> Retour à la boutique
      </Link>
      <h1 className="text-3xl font-display font-bold mb-6">Commandes</h1>
      {orders.length === 0 ? (
        <p className="text-zinc-500 italic">Aucune commande pour l'instant.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/admin/shop/orders/${o.id}`}
                  className="block bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-brand-pink/40 rounded-2xl p-4 transition">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold">#{o.id.slice(0, 8).toUpperCase()} — {o.email}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(o.createdAt).toLocaleString('fr-FR')} · {o.paymentProvider} ·
                    <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold ${o.status === 'SHIPPED' ? 'bg-violet-500/20 text-violet-300' : o.status === 'PAID' ? 'bg-cyan-500/20 text-cyan-300' : o.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-700 text-zinc-300'}`}>{o.status}</span>
                  </p>
                </div>
                <p className="font-bold text-brand-pink text-lg">{fmt(o.totalCents)}</p>
              </div>
              <ul className="text-sm text-zinc-300 space-y-1 ml-3">
                {o.items.map((it) => (
                  <li key={it.id}>
                    {it.quantity} × {it.product.title} — {fmt(it.priceCents * it.quantity)}
                    {it.variant ? <span className="text-zinc-500 ml-2 text-xs">{JSON.stringify(it.variant)}</span> : null}
                  </li>
                ))}
              </ul>
              {(o.name || o.phone || o.shippingAddress) && (
                <div className="text-xs text-zinc-400 mt-2 border-t border-zinc-800 pt-2">
                  {o.name && <>👤 {o.name}<br /></>}
                  {o.phone && <>📞 {o.phone}<br /></>}
                  {o.shippingAddress && <>📦 {o.shippingAddress.split('\n')[0]}</>}
                </div>
              )}
              {o.trackingNumber && (
                <p className="text-xs text-violet-300 mt-2">📦 Tracking : <span className="font-mono">{o.trackingNumber}</span></p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
