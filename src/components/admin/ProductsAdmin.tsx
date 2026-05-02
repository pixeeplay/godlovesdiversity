'use client';
import { useState } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, ExternalLink } from 'lucide-react';

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceCents: number;
  currency: string;
  images: string[];
  stock: number | null;
  category: string | null;
  variants: any;
  order: number;
  published: boolean;
};

export function ProductsAdmin({ initialItems }: { initialItems: Product[] }) {
  const [items, setItems] = useState<Product[]>(initialItems);
  const [draft, setDraft] = useState({ title: '', priceEuros: 25, category: 'Vêtement', stock: '', imagesText: '' });
  const [saving, setSaving] = useState<string | null>(null);

  async function add() {
    if (!draft.title) { alert('Titre requis'); return; }
    setSaving('new');
    const r = await fetch('/api/admin/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: draft.title,
        priceCents: Math.round(draft.priceEuros * 100),
        currency: 'EUR',
        category: draft.category,
        stock: draft.stock === '' ? null : Number(draft.stock),
        images: draft.imagesText.split('\n').map((s) => s.trim()).filter(Boolean)
      })
    });
    if (r.ok) {
      const created = await r.json();
      setItems([created, ...items]);
      setDraft({ title: '', priceEuros: 25, category: 'Vêtement', stock: '', imagesText: '' });
    }
    setSaving(null);
  }

  async function update(p: Product) {
    setSaving(p.id);
    await fetch(`/api/admin/products/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    setSaving(null);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    setItems(items.filter((x) => x.id !== id));
  }

  function setField<K extends keyof Product>(id: string, field: K, value: Product[K]) {
    setItems(items.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  return (
    <div className="space-y-6">
      {/* New */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2"><Plus size={18} /> Nouveau produit</h2>
        <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
               placeholder="Titre du produit (ex: T-shirt arc-en-ciel)"
               value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-zinc-400">Prix (€)</label>
            <input type="number" step="0.01" min="0"
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                   value={draft.priceEuros} onChange={(e) => setDraft({ ...draft, priceEuros: Number(e.target.value) })} />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Catégorie</label>
            <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              <option>Vêtement</option><option>Affiche</option><option>Accessoire</option>
              <option>Livre</option><option>Autocollant</option><option>Autre</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400">Stock (vide = illimité)</label>
            <input type="number" min="0" placeholder="vide"
                   className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                   value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
          </div>
        </div>
        <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                  placeholder="URLs des images (1 par ligne)"
                  value={draft.imagesText} onChange={(e) => setDraft({ ...draft, imagesText: e.target.value })} />
        <button onClick={add} disabled={saving === 'new'}
                className="bg-brand-pink hover:bg-pink-600 text-white font-bold px-5 py-2 rounded-lg disabled:opacity-50">
          {saving === 'new' ? 'Ajout…' : 'Ajouter le produit'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-zinc-500 text-sm italic">Aucun produit. Crée le premier ci-dessus !</p>
        ) : items.map((p) => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 shrink-0">no img</div>
              )}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                <input className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm md:col-span-2"
                       value={p.title} onChange={(e) => setField(p.id, 'title', e.target.value)} placeholder="Titre" />
                <input type="number" step="1" min="0"
                       className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                       value={p.priceCents} onChange={(e) => setField(p.id, 'priceCents', Number(e.target.value))}
                       placeholder="Prix (centimes)" />
              </div>
            </div>

            <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                      value={p.description || ''} onChange={(e) => setField(p.id, 'description', e.target.value)}
                      placeholder="Description" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                      value={p.category || ''} onChange={(e) => setField(p.id, 'category', e.target.value)}>
                <option value="">— catégorie —</option>
                <option>Vêtement</option><option>Affiche</option><option>Accessoire</option>
                <option>Livre</option><option>Autocollant</option><option>Autre</option>
              </select>
              <input type="number" min="0" placeholder="Stock (vide=∞)"
                     className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                     value={p.stock ?? ''} onChange={(e) => setField(p.id, 'stock', e.target.value === '' ? null : Number(e.target.value))} />
              <input type="number" placeholder="Ordre"
                     className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                     value={p.order} onChange={(e) => setField(p.id, 'order', Number(e.target.value))} />
            </div>

            <textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" rows={2}
                      value={(p.images || []).join('\n')}
                      onChange={(e) => setField(p.id, 'images', e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
                      placeholder="URLs images (1 par ligne)" />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">slug : <code className="text-zinc-300">{p.slug}</code></span>
              <button onClick={() => setField(p.id, 'published', !p.published)}
                      className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1">
                {p.published ? <><Eye size={14} /> Publié</> : <><EyeOff size={14} /> Brouillon</>}
              </button>
              <a href={`/boutique/${p.slug}`} target="_blank" rel="noopener noreferrer"
                 className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><ExternalLink size={14} /> Voir</a>
              <div className="flex-1" />
              <button onClick={() => update(p)} disabled={saving === p.id}
                      className="px-4 py-1.5 text-xs rounded bg-brand-pink hover:bg-pink-600 text-white font-bold flex items-center gap-1 disabled:opacity-50">
                <Save size={14} /> {saving === p.id ? '…' : 'Sauvegarder'}
              </button>
              <button onClick={() => remove(p.id)}
                      className="px-3 py-1.5 text-xs rounded bg-red-900/30 hover:bg-red-900/60 text-red-300 flex items-center gap-1">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
