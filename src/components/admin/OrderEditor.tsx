'use client';
import { useState, useMemo } from 'react';
import { Save, Truck, Package, Mail, MessageCircle, ExternalLink, Loader2, Calculator, Printer, Sparkles } from 'lucide-react';
import { CARRIERS, calculateShippingCost, estimateWeight, type CarrierId } from '@/lib/shipping';

type Order = any;

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

const STATUS_OPTIONS = ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED'];

export function OrderEditor({ initial }: { initial: Order }) {
  const [order, setOrder] = useState<Order>(initial);
  const [saving, setSaving] = useState(false);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [shipmentResult, setShipmentResult] = useState<{ trackingNumber?: string; labelPdfUrl?: string | null } | null>(null);

  async function pushToDropship() {
    if (!confirm('Envoyer cette commande aux fournisseurs dropshipping (Gelato/TPOP/Printful) ? Tu seras facturé par le fournisseur.')) return;
    try {
      const r = await fetch(`/api/admin/orders/${order.id}/dropship`, { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        alert(`✅ Commande envoyée chez ${j.results.map((r: any) => r.provider).join(', ')}.\n${j.message || ''}`);
      } else {
        alert(`Erreur dropshipping :\n${j.results?.map((r: any) => `${r.provider}: ${r.error || 'OK'}`).join('\n') || j.error}`);
      }
    } catch (e: any) { alert(e.message); }
  }

  async function createSendcloudShipment() {
    if (!confirm('Créer une vraie expédition Sendcloud ? Une étiquette sera facturée selon le transporteur choisi.')) return;
    setCreatingShipment(true);
    setShipmentResult(null);
    try {
      const r = await fetch(`/api/admin/orders/${order.id}/create-shipment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: order.carrier === 'mondial-relay' ? 'mondial_relay' : (order.carrier || 'colissimo') })
      });
      const j = await r.json();
      if (j.error) {
        alert(`Erreur Sendcloud : ${j.error}`);
      } else {
        setOrder(j.order);
        setShipmentResult({ trackingNumber: j.trackingNumber, labelPdfUrl: j.labelPdfUrl });
        if (j.labelPdfUrl) window.open(j.labelPdfUrl, '_blank');
      }
    } catch (e: any) {
      alert(e.message || 'Erreur réseau');
    }
    setCreatingShipment(false);
  }

  // Auto-estime poids et calcule tarif
  const estimatedWeight = useMemo(() => {
    return order.items.reduce((sum: number, it: any) => {
      return sum + estimateWeight(it.product.category, it.quantity);
    }, 100); // +100g pour l'emballage
  }, [order.items]);

  const computedShipping = useMemo(() => {
    const w = order.weightGrams || estimatedWeight;
    return order.carrier ? calculateShippingCost(order.carrier as CarrierId, w, order.shippingCountry || 'FR') : 0;
  }, [order.carrier, order.weightGrams, estimatedWeight, order.shippingCountry]);

  function setField<K extends keyof Order>(field: K, value: Order[K]) {
    setOrder({ ...order, [field]: value });
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: order.status,
          weightGrams: order.weightGrams || estimatedWeight,
          carrier: order.carrier,
          shippingCost: order.shippingCost ?? computedShipping,
          trackingNumber: order.trackingNumber,
          notes: order.notes
        })
      });
      const updated = await r.json();
      if (updated.error) alert(updated.error);
      else { setOrder(updated); }
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function markShipped() {
    if (!order.trackingNumber) {
      if (!confirm('Aucun numéro de suivi saisi. Marquer comme expédié quand même (sans envoyer le tracking au client) ?')) return;
    }
    setOrder({ ...order, status: 'SHIPPED' });
    setTimeout(save, 100);
  }

  function applyAutoWeight() {
    setField('weightGrams', estimatedWeight);
  }
  function applyAutoCost() {
    setField('shippingCost', computedShipping);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      {/* LEFT — items + shipping */}
      <div className="space-y-6">
        {/* Items */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-3">Articles</h2>
          <div className="space-y-2">
            {order.items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                {it.product.images?.[0] && <img src={it.product.images[0]} alt="" className="w-12 h-12 rounded object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{it.product.title}</p>
                  {it.variant && <p className="text-xs text-zinc-400">{Object.entries(it.variant).map(([k, v]) => `${k}: ${v}`).join(' · ')}</p>}
                  <p className="text-xs text-zinc-500">Qté {it.quantity} · {fmt(it.priceCents)}</p>
                </div>
                <p className="font-bold text-brand-pink">{fmt(it.priceCents * it.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-800 pt-3 mt-3 flex justify-between font-bold">
            <span>Total commande</span>
            <span className="text-brand-pink text-lg">{fmt(order.totalCents)}</span>
          </div>
        </div>

        {/* Shipping */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Truck size={20} /> Expédition</h2>

          <label className="block text-xs text-zinc-400 mb-1">Statut</label>
          <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-4"
                  value={order.status} onChange={(e) => setField('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>

          <label className="block text-xs text-zinc-400 mb-1">Transporteur</label>
          <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-4"
                  value={order.carrier || ''} onChange={(e) => setField('carrier', e.target.value)}>
            <option value="">— choisir —</option>
            {Object.entries(CARRIERS).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {v.description}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Poids (g)</label>
              <div className="flex gap-2">
                <input type="number" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                       value={order.weightGrams || ''}
                       onChange={(e) => setField('weightGrams', e.target.value === '' ? null : Number(e.target.value))}
                       placeholder={`auto ${estimatedWeight}g`} />
                <button onClick={applyAutoWeight} title="Auto-estimer"
                        className="px-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs"><Calculator size={14} /></button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Coût expédition</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                       value={order.shippingCost ? (order.shippingCost / 100) : ''}
                       onChange={(e) => setField('shippingCost', e.target.value === '' ? null : Math.round(Number(e.target.value) * 100))}
                       placeholder={`auto ${(computedShipping / 100).toFixed(2)} €`} />
                <button onClick={applyAutoCost} title="Calculer auto"
                        className="px-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs"><Calculator size={14} /></button>
              </div>
            </div>
          </div>

          <label className="block text-xs text-zinc-400 mb-1">N° de suivi</label>
          <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono mb-4"
                 value={order.trackingNumber || ''}
                 onChange={(e) => setField('trackingNumber', e.target.value)}
                 placeholder="ex : 6A12345678901" />

          <label className="block text-xs text-zinc-400 mb-1">Notes internes</label>
          <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                    value={order.notes || ''}
                    onChange={(e) => setField('notes', e.target.value)} />

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={save} disabled={saving}
                    className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauvegarder
            </button>
            <button onClick={createSendcloudShipment} disabled={creatingShipment}
                    title="Crée une vraie étiquette + tracking number via Sendcloud"
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
              {creatingShipment ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {creatingShipment ? 'Création…' : '🚀 Étiquette officielle Sendcloud'}
            </button>
            <button onClick={pushToDropship}
                    title="Envoie cette commande aux fournisseurs Print-on-Demand (Gelato/TPOP/Printful) qui impriment + expédient directement"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
              📦 Envoyer en dropship
            </button>
            {order.status !== 'SHIPPED' && order.status === 'PAID' && (
              <button onClick={markShipped} disabled={saving}
                      className="bg-violet-500 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                <Truck size={14} /> Marquer expédié + notifier client
              </button>
            )}
            <a href={`/api/admin/orders/${order.id}/label`} target="_blank" rel="noopener noreferrer"
               className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2">
              <Printer size={14} /> Étiquette HTML (mockup)
            </a>
          </div>

          {shipmentResult && (
            <div className="mt-4 bg-emerald-950/40 border border-emerald-700 rounded-lg p-4 text-sm">
              <p className="font-bold text-emerald-300 mb-2">✅ Étiquette officielle créée !</p>
              <p>Numéro de suivi : <code className="font-mono text-white">{shipmentResult.trackingNumber}</code></p>
              {shipmentResult.labelPdfUrl && (
                <a href={shipmentResult.labelPdfUrl} target="_blank" rel="noopener noreferrer"
                   className="inline-block mt-2 text-emerald-300 hover:underline">→ Télécharger le PDF de l'étiquette</a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — client info */}
      <aside className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3">Client</h3>
          <p className="font-bold">{order.name || '—'}</p>
          <p className="text-sm text-zinc-300">{order.email}</p>
          {order.phone && <p className="text-sm text-zinc-300">{order.phone}</p>}
          <div className="mt-3 pt-3 border-t border-zinc-800 text-sm whitespace-pre-line text-zinc-300">
            <p className="text-xs text-zinc-500 mb-1">📍 Adresse</p>
            {order.shippingAddress || '—'}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3">Notifications client</h3>
          <p className="text-xs text-zinc-400 mb-3">
            Quand tu passes en <strong>SHIPPED</strong>, on envoie automatiquement :
          </p>
          <ul className="text-sm space-y-2">
            <li className="flex items-center gap-2"><Mail size={14} className="text-emerald-400" /> Email avec tracking</li>
            <li className="flex items-center gap-2"><MessageCircle size={14} className={order.phone ? 'text-emerald-400' : 'text-zinc-600'} />
              SMS {order.phone ? '(prêt)' : '(pas de tel)'}</li>
          </ul>
          <a href={`/commande/${order.publicToken}`} target="_blank" rel="noopener noreferrer"
             className="mt-4 block text-center bg-zinc-800 hover:bg-zinc-700 text-sm rounded-lg px-3 py-2 flex items-center justify-center gap-1">
            <ExternalLink size={14} /> Voir page suivi client
          </a>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs text-zinc-400 space-y-1">
          <p><span className="text-zinc-500">Paiement :</span> {order.paymentProvider}</p>
          <p><span className="text-zinc-500">Créée :</span> {new Date(order.createdAt).toLocaleString('fr-FR')}</p>
          {order.shippedAt && <p><span className="text-zinc-500">Expédiée :</span> {new Date(order.shippedAt).toLocaleString('fr-FR')}</p>}
        </div>
      </aside>
    </div>
  );
}
