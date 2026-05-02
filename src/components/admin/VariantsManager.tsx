'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Save, UploadCloud, X, Sparkles, Loader2, Layers, ChevronDown } from 'lucide-react';

type Variant = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  options: Record<string, string>;
  priceCents: number | null;
  stock: number | null;
  images: string[];
  order: number;
  published: boolean;
};

type Props = {
  productId: string;
  productPriceCents: number;
  optionLabels: string[]; // ex: ['Taille', 'Couleur']
};

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function VariantsManager({ productId, productPriceCents, optionLabels }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Variant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const labels = optionLabels.length > 0 ? optionLabels : ['Taille', 'Couleur'];

  async function load() {
    const r = await fetch(`/api/admin/products/${productId}/variants`);
    const j = await r.json();
    setItems(j.items || []);
    setLoaded(true);
  }

  function toggle() {
    setOpen(!open);
    if (!open && !loaded) load();
  }

  async function add() {
    const opts: Record<string, string> = {};
    for (const l of labels) opts[l] = '';
    const r = await fetch(`/api/admin/products/${productId}/variants`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Nouveau variant ${items.length + 1}`, options: opts, order: items.length })
    });
    if (r.ok) {
      const created = await r.json();
      setItems([...items, created]);
    }
  }

  async function update(v: Variant) {
    setSaving(v.id);
    await fetch(`/api/admin/variants/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    });
    setSaving(null);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce variant ?')) return;
    await fetch(`/api/admin/variants/${id}`, { method: 'DELETE' });
    setItems(items.filter((v) => v.id !== id));
  }

  function setField<K extends keyof Variant>(id: string, field: K, value: Variant[K]) {
    setItems(items.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  }

  function setOption(id: string, key: string, value: string) {
    setItems(items.map((v) => (v.id === id ? { ...v, options: { ...v.options, [key]: value } } : v)));
  }

  async function uploadImage(v: Variant, file: File) {
    setUploading(v.id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/admin/variants/${v.id}`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.error) alert(j.error);
      else if (j.images) setItems(items.map((x) => (x.id === v.id ? { ...x, images: j.images } : x)));
    } catch (e: any) { alert(e.message); }
    setUploading(null);
  }

  async function generateAi(v: Variant) {
    setGenerating(v.id);
    try {
      const r = await fetch(`/api/admin/variants/${v.id}/generate-image`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
      });
      const j = await r.json();
      if (j.error) alert(j.error);
      else if (j.images) setItems(items.map((x) => (x.id === v.id ? { ...x, images: j.images } : x)));
    } catch (e: any) { alert(e.message); }
    setGenerating(null);
  }

  async function removeImage(v: Variant, idx: number) {
    const newImages = v.images.filter((_, i) => i !== idx);
    setField(v.id, 'images', newImages);
    await fetch(`/api/admin/variants/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: newImages })
    });
  }

  return (
    <div className="border-t border-zinc-800 pt-3 mt-3">
      <button onClick={toggle} className="w-full flex items-center justify-between bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-sm transition">
        <span className="flex items-center gap-2 font-bold">
          <Layers size={14} className="text-brand-pink" /> Variants {items.length > 0 && <span className="text-xs text-zinc-400">({items.length})</span>}
        </span>
        <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {!loaded ? (
            <p className="text-zinc-500 text-sm italic">Chargement…</p>
          ) : (
            <>
              {items.length === 0 ? (
                <p className="text-zinc-500 text-sm italic">Aucun variant. Ajoute-en un pour proposer plusieurs prix/couleurs/tailles avec leurs propres images.</p>
              ) : items.map((v) => (
                <div key={v.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
                  <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-sm font-bold"
                         value={v.name} onChange={(e) => setField(v.id, 'name', e.target.value)} placeholder="Nom du variant" />

                  {/* Options key/value */}
                  <div className="grid grid-cols-2 gap-2">
                    {labels.map((l) => (
                      <input key={l} className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs"
                             value={v.options[l] || ''} onChange={(e) => setOption(v.id, l, e.target.value)}
                             placeholder={l} />
                    ))}
                  </div>

                  {/* Prix + stock + sku */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500">Prix override (€)</label>
                      <input type="number" step="0.01" min="0"
                             className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs"
                             value={v.priceCents === null ? '' : v.priceCents / 100}
                             onChange={(e) => setField(v.id, 'priceCents', e.target.value === '' ? null : Math.round(Number(e.target.value) * 100))}
                             placeholder={fmt(productPriceCents)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500">Stock</label>
                      <input type="number" min="0"
                             className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs"
                             value={v.stock === null ? '' : v.stock}
                             onChange={(e) => setField(v.id, 'stock', e.target.value === '' ? null : Number(e.target.value))}
                             placeholder="∞" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500">SKU</label>
                      <input className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-xs font-mono"
                             value={v.sku || ''} onChange={(e) => setField(v.id, 'sku', e.target.value)} />
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <label className="text-[10px] text-zinc-500 mb-1 block">Images du variant ({v.images.length})</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {v.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded overflow-hidden border border-zinc-700 bg-zinc-900">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => removeImage(v, idx)}
                                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => fileInputs.current[v.id]?.click()} disabled={uploading === v.id}
                              className="aspect-square rounded border border-dashed border-zinc-700 hover:border-brand-pink text-zinc-400 hover:text-brand-pink flex items-center justify-center text-xs disabled:opacity-50">
                        {uploading === v.id ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                      </button>
                      <button onClick={() => generateAi(v)} disabled={generating === v.id}
                              title="Générer image IA Nano Banana"
                              className="aspect-square rounded border border-dashed border-yellow-500/40 hover:border-yellow-500 text-yellow-500 flex items-center justify-center text-xs disabled:opacity-50">
                        {generating === v.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      </button>
                      <input ref={(el) => { fileInputs.current[v.id] = el; }} type="file" accept="image/*" className="hidden"
                             onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(v, f); e.target.value = ''; }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={v.published} onChange={(e) => setField(v.id, 'published', e.target.checked)} className="accent-brand-pink" />
                      Publié
                    </label>
                    <div className="flex-1" />
                    <button onClick={() => update(v)} disabled={saving === v.id}
                            className="px-3 py-1.5 text-xs rounded bg-brand-pink hover:bg-pink-600 text-white font-bold flex items-center gap-1 disabled:opacity-50">
                      <Save size={12} /> {saving === v.id ? '…' : 'Sauver'}
                    </button>
                    <button onClick={() => remove(v.id)} className="px-2 py-1.5 text-xs rounded bg-red-900/30 hover:bg-red-900/60 text-red-300">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={add} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-brand-pink text-brand-pink rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2">
                <Plus size={14} /> Ajouter un variant
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
