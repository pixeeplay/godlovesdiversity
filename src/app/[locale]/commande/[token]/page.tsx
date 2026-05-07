import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Package, Truck, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suivi de ma commande — parislgbt' };

const STATUS_META: Record<string, { label: string; color: string; icon: any; step: number }> = {
  PENDING:   { label: 'En attente de paiement', color: '#FBBF24', icon: Clock, step: 1 },
  PAID:      { label: 'Payée — préparation en cours', color: '#22D3EE', icon: Package, step: 2 },
  SHIPPED:   { label: 'Expédiée', color: '#8B5CF6', icon: Truck, step: 3 },
  CANCELLED: { label: 'Annulée', color: '#94A3B8', icon: Clock, step: 0 },
  REFUNDED:  { label: 'Remboursée', color: '#94A3B8', icon: Clock, step: 0 }
};

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { publicToken: token },
    include: { items: { include: { product: true } } }
  }).catch(() => null);

  if (!order) notFound();

  const meta = STATUS_META[order.status] || STATUS_META.PENDING;
  const StatusIcon = meta.icon;

  return (
    <main className="min-h-screen py-12">
      <div className="container-tight">
        <h1 className="text-3xl md:text-4xl font-display font-black gradient-text mb-2">Ma commande</h1>
        <p className="text-white/60 mb-8">N° {order.id.slice(0, 8).toUpperCase()} · passée le {new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>

        {/* Status badge */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 flex items-center gap-4"
             style={{ borderColor: `${meta.color}66` }}>
          <div className="rounded-full p-3" style={{ background: `${meta.color}22` }}>
            <StatusIcon size={32} style={{ color: meta.color }} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Statut</p>
            <p className="text-xl font-bold">{meta.label}</p>
            {order.status === 'SHIPPED' && order.shippedAt && (
              <p className="text-sm text-white/60 mt-1">Expédiée le {new Date(order.shippedAt).toLocaleDateString('fr-FR')}</p>
            )}
          </div>
        </div>

        {/* Tracking */}
        {order.trackingNumber && (
          <div className="bg-violet-950/40 border border-violet-700 rounded-2xl p-5 mb-6">
            <p className="text-xs uppercase tracking-widest text-violet-300 mb-2">📦 Numéro de suivi</p>
            <p className="font-mono text-lg text-white mb-3">{order.trackingNumber}</p>
            <p className="text-sm text-white/70 mb-3">Transporteur : <strong>{order.carrier}</strong></p>
            {order.trackingUrl && (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-full text-sm">
                Suivre le colis chez {order.carrier} <ExternalLink size={14} />
              </a>
            )}
          </div>
        )}

        {/* Steps */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {[
            { step: 1, label: 'Payée' },
            { step: 2, label: 'Préparation' },
            { step: 3, label: 'Expédiée' }
          ].map((s) => {
            const active = meta.step >= s.step;
            return (
              <div key={s.step} className={`p-3 rounded-xl text-center text-sm font-bold ${active ? 'bg-brand-pink/20 text-brand-pink border border-brand-pink/40' : 'bg-white/5 text-white/40 border border-white/5'}`}>
                {active && '✓ '}{s.label}
              </div>
            );
          })}
        </div>

        {/* Items */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-lg mb-4">Articles ({order.items.length})</h2>
          <div className="space-y-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0">
                {it.product.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.product.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/boutique/${it.product.slug}`} className="font-bold hover:text-brand-pink truncate block">{it.product.title}</Link>
                  {it.variant && <p className="text-xs text-white/50">{Object.entries(it.variant as any).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                  <p className="text-xs text-white/60">Qté : {it.quantity} × {fmt(it.priceCents)}</p>
                </div>
                <p className="font-bold text-brand-pink">{fmt(it.priceCents * it.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-brand-pink">{fmt(order.totalCents)}</span>
          </div>
        </div>

        {/* Shipping */}
        {order.shippingAddress && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="font-bold text-lg mb-3">📍 Adresse de livraison</h2>
            <p className="text-white/80 whitespace-pre-line">{order.name}<br/>{order.shippingAddress}</p>
          </div>
        )}

        <p className="text-center text-white/40 text-sm mt-8">
          Une question ? Contacte-nous : <a href="mailto:contact@godlovesdiversity.org" className="text-brand-pink hover:underline">contact@godlovesdiversity.org</a>
        </p>
      </div>
    </main>
  );
}
