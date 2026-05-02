'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, ExternalLink, Sparkles, Loader2, UploadCloud, X, Truck, TrendingUp, Search } from 'lucide-react';
import { VariantsManager } from './VariantsManager';

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
  const [generating, setGenerating] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  // Recherche / filtres / vue
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Catégories uniques pour le filtre
  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];

  const filtered = items.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterStatus === 'published' && !p.published) return false;
    if (filterStatus === 'draft' && p.published) return false;
    return true;
  });

  async function uploadImage(p: Product, file: File) {
    setUploading(p.id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/admin/products/${p.id}/upload-image`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.error) alert(j.error);
      else if (j.images) setItems(items.map((x) => (x.id === p.id ? { ...x, images: j.images } : x)));
    } catch (e: any) { alert(e.message); }
    setUploading(null);
  }

  async function removeImage(p: Product, idx: number) {
    if (!confirm('Supprimer cette image ?')) return;
    const r = await fetch(`/api/admin/products/${p.id}/upload-image`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeIndex: idx })
    });
    const j = await r.json();
    if (j.images) setItems(items.map((x) => (x.id === p.id ? { ...x, images: j.images } : x)));
  }

  async function generateImage(p: Product, customPrompt?: string) {
    setGenerating(p.id);
    try {
      const r = await fetch(`/api/admin/products/${p.id}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt || undefined })
      });
      const j = await r.json();
      if (j.error) {
        alert(`Erreur génération : ${j.error}`);
      } else if (j.images) {
        setItems(items.map((x) => (x.id === p.id ? { ...x, images: j.images } : x)));
      }
    } catch (e: any) {
      alert(e.message || 'Erreur réseau');
    }
    setGenerating(null);
  }

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
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
                 placeholder="Rechercher un produit…"
                 className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-brand-pink outline-none" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
          <option value="">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
          {[{ v: 'all', l: `Tous (${items.length})` }, { v: 'published', l: `✓ Publiés (${items.filter((p) => p.published).length})` }, { v: 'draft', l: `Brouillons (${items.filter((p) => !p.published).length})` }].map((f) => (
            <button key={f.v} onClick={() => setFilterStatus(f.v as any)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition ${filterStatus === f.v ? 'bg-brand-pink text-white' : 'text-zinc-400 hover:text-white'}`}>
              {f.l}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
                className="bg-gradient-to-r from-brand-pink to-violet-500 hover:from-pink-600 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
          <Plus size={16} /> Nouveau produit
        </button>
      </div>

      {/* New (collapsible) */}
      {showCreate && (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 border-brand-pink/40 rounded-2xl p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2 text-brand-pink"><Plus size={18} /> Nouveau produit</h2>
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
                <option>Livre</option><option>Autocollant</option><option>Bougie</option><option>Autre</option>
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
                    placeholder="URLs des images (1 par ligne) — tu pourras uploader directement après création"
                    value={draft.imagesText} onChange={(e) => setDraft({ ...draft, imagesText: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm">Annuler</button>
            <button onClick={() => { add(); setShowCreate(false); }} disabled={saving === 'new'}
                    className="bg-brand-pink hover:bg-pink-600 text-white font-bold px-5 py-2 rounded-lg disabled:opacity-50 text-sm">
              {saving === 'new' ? 'Création…' : '✨ Créer le produit'}
            </button>
          </div>
        </div>
      )}

      {/* GRID PRODUITS — vue liste compacte avec expansion */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          items.length === 0 ? (
            <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl p-12 text-center">
              <p className="text-zinc-500 text-sm">Aucun produit pour l'instant.</p>
              <button onClick={() => setShowCreate(true)} className="mt-4 bg-brand-pink hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-full text-sm">
                <Plus size={14} className="inline mr-1" /> Créer le premier produit
              </button>
            </div>
          ) : (
            <p className="text-zinc-500 text-sm italic text-center py-8">Aucun produit ne correspond aux filtres.</p>
          )
        ) : filtered.map((p) => (
          <div key={p.id} className={`bg-zinc-900 border ${expanded === p.id ? 'border-brand-pink/50' : 'border-zinc-800 hover:border-zinc-700'} rounded-2xl transition`}>
            {/* Bandeau résumé cliquable */}
            <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="w-full p-4 flex items-center gap-4 text-left">
              {p.images?.[0] ? (
                <img src={p.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-zinc-700" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-500 shrink-0">no img</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-white truncate">{p.title}</h3>
                  {!p.published && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">Brouillon</span>}
                  {(p as any).dropProvider && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">📦 Dropship {(p as any).dropProvider}</span>}
                </div>
                <p className="text-xs text-zinc-500 truncate">
                  {p.category && <>{p.category} · </>}
                  <code className="text-zinc-600">{p.slug}</code>
                  {(p.images || []).length > 0 && <> · {(p.images || []).length} image{(p.images || []).length > 1 ? 's' : ''}</>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-brand-pink">{(p.priceCents / 100).toFixed(2)} €</p>
                {(p as any).costCents && (
                  <p className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                    <TrendingUp size={10} /> +{((p.priceCents - (p as any).costCents) / 100).toFixed(2)} € marge
                  </p>
                )}
                {p.stock !== null && p.stock !== undefined && p.stock <= 5 && p.stock > 0 && <p className="text-[10px] text-amber-400">⚠ stock {p.stock}</p>}
                {p.stock === 0 && <p className="text-[10px] text-red-400">Épuisé</p>}
              </div>
              <div className="text-zinc-500 shrink-0">{expanded === p.id ? '▾' : '▸'}</div>
            </button>

            {/* Contenu détaillé seulement si expanded */}
            {expanded === p.id && (
              <div className="border-t border-zinc-800 p-4 space-y-3">
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

            {/* Galerie d'images interactive */}
            <div>
              <label className="block text-xs text-zinc-400 mb-2">Images du produit ({p.images?.length || 0})</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(p.images || []).map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && <span className="absolute top-1 left-1 bg-brand-pink text-white text-[9px] font-bold px-1.5 py-0.5 rounded">Cover</span>}
                    <button onClick={() => removeImage(p, idx)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* Bouton + Upload */}
                <button
                  type="button"
                  onClick={() => fileInputs.current[p.id]?.click()}
                  disabled={uploading === p.id}
                  className="aspect-square rounded-lg border-2 border-dashed border-zinc-700 hover:border-brand-pink hover:bg-brand-pink/5 flex flex-col items-center justify-center text-zinc-400 hover:text-brand-pink transition disabled:opacity-50">
                  {uploading === p.id ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                  <span className="text-[10px] mt-1">{uploading === p.id ? 'Upload…' : 'Ajouter'}</span>
                </button>
                <input
                  ref={(el) => { fileInputs.current[p.id] = el; }}
                  type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(p, f); e.target.value = ''; }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">La 1ʳᵉ image = couverture (vignette boutique). Survole une image pour la supprimer.</p>
            </div>

            {/* ─── DROPSHIPPING ─── */}
            <div className="border-t border-zinc-800 pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Dropshipping (impression à la demande)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                        value={(p as any).dropProvider || ''}
                        onChange={(e) => setField(p.id, 'dropProvider' as any, e.target.value as any)}>
                  <option value="">— Pas de dropshipping (stock interne) —</option>
                  <option value="gelato">🌍 Gelato (Europe rapide)</option>
                  <option value="tpop">🌱 TPOP (France éthique)</option>
                  <option value="printful">👕 Printful</option>
                </select>
                <input className="bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm font-mono"
                       value={(p as any).dropProductId || ''}
                       onChange={(e) => setField(p.id, 'dropProductId' as any, e.target.value as any)}
                       placeholder="ID produit chez le fournisseur" />
                <div>
                  <input type="number" step="0.01" min="0"
                         className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm"
                         value={(p as any).costCents ? (p as any).costCents / 100 : ''}
                         onChange={(e) => setField(p.id, 'costCents' as any, (e.target.value === '' ? null : Math.round(Number(e.target.value) * 100)) as any)}
                         placeholder="Prix d'achat HT (€)" />
                </div>
              </div>
              {/* Marge calculée */}
              {(p as any).costCents && p.priceCents && (
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="text-zinc-400">Achat : <strong className="text-white">{((p as any).costCents / 100).toFixed(2)} €</strong></span>
                  <span className="text-zinc-400">→ Vente : <strong className="text-white">{(p.priceCents / 100).toFixed(2)} €</strong></span>
                  <span className="text-zinc-400">→</span>
                  <span className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${
                    p.priceCents - (p as any).costCents > 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    <TrendingUp size={12} />
                    {((p.priceCents - (p as any).costCents) / 100).toFixed(2)} € de marge
                    ({Math.round(((p.priceCents - (p as any).costCents) / p.priceCents) * 100)}%)
                  </span>
                </div>
              )}
              {(p as any).dropProvider && !(p as any).dropProductId && (
                <p className="text-amber-400 text-xs mt-2">⚠ Renseigne l'ID du produit chez {(p as any).dropProvider} pour activer le dropshipping auto.</p>
              )}
            </div>

            {/* ─── VARIANTS (prix/stock/images par déclinaison) ─── */}
            <VariantsManager
              productId={p.id}
              productPriceCents={p.priceCents}
              optionLabels={p.variants && typeof p.variants === 'object' && !Array.isArray(p.variants) ? Object.keys(p.variants as any) : ['Taille', 'Couleur']}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">slug : <code className="text-zinc-300">{p.slug}</code></span>
              <button onClick={() => setField(p.id, 'published', !p.published)}
                      className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1">
                {p.published ? <><Eye size={14} /> Publié</> : <><EyeOff size={14} /> Brouillon</>}
              </button>
              <a href={`/boutique/${p.slug}`} target="_blank" rel="noopener noreferrer"
                 className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1"><ExternalLink size={14} /> Voir</a>
              <button onClick={() => generateImage(p)} disabled={generating === p.id}
                      title="Générer une image avec Gemini Nano Banana"
                      className="px-3 py-1.5 text-xs rounded bg-gradient-to-r from-yellow-500 to-pink-500 hover:from-yellow-600 hover:to-pink-600 text-white font-bold flex items-center gap-1 disabled:opacity-50">
                {generating === p.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {generating === p.id ? 'Génération…' : '🍌 Générer image IA'}
              </button>
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
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
