'use client';
import { useState } from 'react';
import { Tag, Plus, Loader2, Calendar, Percent, Euro, Trash2 } from 'lucide-react';

export function CouponsAdmin({ initial }: { initial: any[] }) {
  const [coupons, setCoupons] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '', discountKind: 'percent', discountValue: 10, minOrderCents: 0,
    maxUses: '', validUntil: '', active: true
  });

  async function create() {
    setCreating(true);
    try {
      const r = await fetch('/api/admin/coupons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newCoupon,
          code: newCoupon.code.toUpperCase(),
          discountValue: Number(newCoupon.discountValue),
          minOrderCents: Number(newCoupon.minOrderCents) || null,
          maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : null,
          validUntil: newCoupon.validUntil ? new Date(newCoupon.validUntil).toISOString() : null
        })
      });
      const j = await r.json();
      if (r.ok && j.coupon) {
        setCoupons([j.coupon, ...coupons]);
        setNewCoupon({ ...newCoupon, code: '' });
      } else alert(`Erreur : ${j.error}`);
    } finally { setCreating(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce coupon ?')) return;
    const r = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
    if (r.ok) setCoupons(coupons.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-xl p-2.5">
          <Tag size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-display font-bold">Coupons & Promotions</h1>
      </header>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Plus size={16} className="text-emerald-400" /> Nouveau coupon</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} placeholder="CODE (ex: GLD2026)" className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm uppercase" />
          <select value={newCoupon.discountKind} onChange={(e) => setNewCoupon({ ...newCoupon, discountKind: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="percent">Pourcentage (%)</option>
            <option value="fixed">Montant fixe (€)</option>
          </select>
          <input type="number" value={newCoupon.discountValue} onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })} placeholder={newCoupon.discountKind === 'percent' ? '10 (%)' : '500 (cts)'} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <input type="date" value={newCoupon.validUntil} onChange={(e) => setNewCoupon({ ...newCoupon, validUntil: e.target.value })} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
        </div>
        <button onClick={create} disabled={creating || !newCoupon.code} className="mt-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Créer le coupon
        </button>
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {coupons.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Aucun coupon créé.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/50 text-zinc-400 text-[10px] uppercase">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Réduction</th>
                <th className="text-left px-4 py-3">Utilisations</th>
                <th className="text-left px-4 py-3">Validité</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-300">{c.code}</td>
                  <td className="px-4 py-3 text-white">
                    {c.discountKind === 'percent'
                      ? <><Percent size={11} className="inline" /> {c.discountValue}%</>
                      : <><Euro size={11} className="inline" /> {(c.discountValue / 100).toFixed(2)}</>
                    }
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{c.uses}{c.maxUses ? `/${c.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{c.validUntil ? new Date(c.validUntil).toLocaleDateString('fr-FR') : '∞'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(c.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
