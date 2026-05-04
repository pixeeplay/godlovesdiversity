'use client';
import { useEffect, useState } from 'react';
import { Trash2, Plus, Minus, ShoppingBag, Loader2, CreditCard, Tag, CheckCircle2, X } from 'lucide-react';
import { getCart, updateQuantity, removeFromCart, cartTotal, formatPrice, clearCart, type CartItem } from '@/lib/cart';

export function CartView() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [provider, setProvider] = useState<'stripe' | 'square'>('stripe');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number; newTotal: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setItems(getCart());
    load();
    window.addEventListener('cart:updated', load);
    return () => window.removeEventListener('cart:updated', load);
  }, []);

  const total = cartTotal();

  function setQty(idx: number, q: number) {
    updateQuantity(idx, q);
    setItems(getCart());
  }
  function remove(idx: number) {
    removeFromCart(idx);
    setItems(getCart());
  }

  async function checkout() {
    if (items.length === 0) return;
    if (!email.includes('@')) { alert('Email requis'); return; }
    setBusy(true); setInfo(null);
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ productId: it.productId, quantity: it.quantity, variant: it.variant })),
          email, name, phone, shippingAddress: address, provider
        })
      });
      const j = await r.json();
      if (j.url) {
        clearCart();
        window.location.href = j.url;
      } else if (j.orderId && j.error) {
        setInfo(`Commande #${j.orderId.slice(0, 8)} enregistrée. ${j.message || j.error} L'admin reviendra vers toi par email à ${email}.`);
        clearCart();
        setItems([]);
      } else {
        alert(j.error || 'Erreur de paiement');
      }
    } catch (e: any) {
      alert(e.message || 'Erreur réseau');
    }
    setBusy(false);
  }

  if (items.length === 0 && !info) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <ShoppingBag className="mx-auto text-white/30 mb-4" size={48} />
        <p className="text-white/60 mb-4">Ton panier est vide.</p>
        <a href="/boutique" className="inline-block bg-brand-pink hover:bg-pink-600 text-white font-bold px-6 py-2.5 rounded-full">Voir la boutique</a>
      </div>
    );
  }

  if (info) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-700 rounded-2xl p-8 text-center">
        <p className="text-white/90 text-lg">{info}</p>
        <a href="/boutique" className="inline-block mt-4 text-brand-pink hover:underline">← Retour boutique</a>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8">
      {/* Items */}
      <div className="space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-center">
            {it.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a href={`/boutique/${it.slug}`} className="font-bold text-white hover:text-brand-pink truncate block">{it.title}</a>
              {it.variant && (
                <p className="text-xs text-white/50">
                  {Object.entries(it.variant).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => setQty(idx, it.quantity - 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Minus size={12} /></button>
                <span className="w-8 text-center font-bold">{it.quantity}</span>
                <button onClick={() => setQty(idx, it.quantity + 1)} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center"><Plus size={12} /></button>
                <button onClick={() => remove(idx)} className="ml-auto text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-brand-pink">{formatPrice(it.priceCents * it.quantity)}</p>
              <p className="text-xs text-white/50">{formatPrice(it.priceCents)} × {it.quantity}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Checkout */}
      <aside className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 self-start sticky top-32">
        <h2 className="font-bold text-xl flex items-center gap-2"><CreditCard size={20} /> Paiement</h2>
        <input className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Nom complet" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm" placeholder="Téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <textarea className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm" rows={2} placeholder="Adresse de livraison" value={address} onChange={(e) => setAddress(e.target.value)} />

        <div className="space-y-2">
          <label className="text-xs text-white/60">Mode de paiement</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setProvider('stripe')} className={`px-3 py-2 rounded-lg text-sm font-bold border ${provider === 'stripe' ? 'bg-brand-pink border-brand-pink text-white' : 'border-white/20 text-white/70'}`}>
              Stripe (CB)
            </button>
            <button onClick={() => setProvider('square')} className={`px-3 py-2 rounded-lg text-sm font-bold border ${provider === 'square' ? 'bg-brand-pink border-brand-pink text-white' : 'border-white/20 text-white/70'}`}>
              Square (Apple Pay)
            </button>
          </div>
        </div>

        {/* COUPON */}
        <div className="border-t border-white/10 pt-4">
          <label className="text-xs uppercase font-bold text-white/60 mb-2 block flex items-center gap-1">
            <Tag size={11} /> Code promo
          </label>
          {coupon ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <div className="flex-1 text-xs">
                <div className="font-bold text-emerald-300">{coupon.code}</div>
                <div className="text-white/60">−{formatPrice(coupon.discount)}</div>
              </div>
              <button onClick={() => { setCoupon(null); setCouponCode(''); }} className="text-zinc-500 hover:text-red-400">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
                placeholder="GLD2026"
                maxLength={20}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm uppercase outline-none focus:border-brand-pink"
              />
              <button
                onClick={async () => {
                  if (!couponCode.trim()) return;
                  setCouponBusy(true); setCouponError(null);
                  try {
                    const r = await fetch('/api/coupons/validate', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code: couponCode, totalCents: total })
                    });
                    const j = await r.json();
                    if (j.valid) setCoupon({ code: j.coupon.code, discount: j.discount, newTotal: j.newTotal });
                    else setCouponError(j.error || 'Code invalide');
                  } finally { setCouponBusy(false); }
                }}
                disabled={couponBusy || !couponCode.trim()}
                className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs"
              >
                {couponBusy ? <Loader2 size={12} className="animate-spin" /> : 'OK'}
              </button>
            </div>
          )}
          {couponError && <p className="text-[11px] text-red-400 mt-1">{couponError}</p>}
        </div>

        {coupon && (
          <div className="flex justify-between text-sm text-white/60">
            <span>Sous-total</span>
            <span className="line-through">{formatPrice(total)}</span>
          </div>
        )}
        <div className="border-t border-white/10 pt-4 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-brand-pink">{formatPrice(coupon ? coupon.newTotal : total)}</span>
        </div>

        <button onClick={checkout} disabled={busy} className="w-full bg-gradient-to-r from-brand-pink to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-bold py-3 rounded-full disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <><Loader2 size={16} className="animate-spin" /> Préparation…</> : 'Payer maintenant'}
        </button>
        <p className="text-xs text-white/40 text-center">Paiement 100% sécurisé. Aucun stockage de carte côté GLD.</p>
      </aside>
    </div>
  );
}
