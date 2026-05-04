'use client';
import { useState } from 'react';
import { Plus, Trash2, Loader2, Check, Sparkles, Save, X } from 'lucide-react';

type Category = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  order: number;
  _count?: { threads: number };
};

const DEFAULT_CATEGORIES = [
  { name: 'Général',                slug: 'general',         description: 'Discussions ouvertes, présentations, bienvenue',           color: '#a78bfa', icon: '💬', order: 0 },
  { name: 'Témoignages',            slug: 'temoignages',     description: 'Partage ton parcours, ton chemin de foi, ta libération',   color: '#f472b6', icon: '🌈', order: 1 },
  { name: 'Foi & spiritualité',     slug: 'foi-spiritualite',description: 'Bible, théologie inclusive, prière, doutes, questions',    color: '#60a5fa', icon: '✝️', order: 2 },
  { name: 'Vie LGBTQ+',             slug: 'vie-lgbtq',       description: 'Coming out, famille, couple, identité, vie quotidienne',   color: '#34d399', icon: '🏳️‍🌈', order: 3 },
  { name: 'Soutien & entraide',     slug: 'soutien',         description: 'Quand ça va pas — la communauté est là pour toi',          color: '#fb923c', icon: '🤝', order: 4 },
  { name: 'Événements & rencontres',slug: 'evenements',      description: 'Cafés, marches des fiertés, retraites, rencontres locales',color: '#f87171', icon: '📅', order: 5 },
];

export function ForumCategoriesAdmin({ initial }: { initial: Category[] }) {
  const [items, setItems] = useState<Category[]>(initial);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#a78bfa');
  const [icon, setIcon] = useState('💬');

  function autoSlug(n: string) {
    return n.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function create(payload?: any) {
    const data = payload || { name, slug, description, color, icon, order: items.length };
    if (!data.name || !data.slug) { alert('Nom + slug requis'); return; }
    setBusy('create');
    try {
      const r = await fetch('/api/admin/forum/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (r.ok && j.category) {
        setItems([...items, { ...j.category, _count: { threads: 0 } }]);
        if (!payload) {
          setName(''); setSlug(''); setDescription(''); setColor('#a78bfa'); setIcon('💬');
          setShowForm(false);
        }
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  async function seedDefaults() {
    if (!confirm(`Créer ${DEFAULT_CATEGORIES.length} catégories par défaut adaptées à GLD ?`)) return;
    setBusy('seed');
    try {
      const existingSlugs = new Set(items.map(i => i.slug));
      for (const cat of DEFAULT_CATEGORIES) {
        if (existingSlugs.has(cat.slug)) continue;
        const r = await fetch('/api/admin/forum/categories', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cat)
        });
        const j = await r.json();
        if (r.ok && j.category) setItems((cur) => [...cur, { ...j.category, _count: { threads: 0 } }]);
      }
      setShowForm(false);
    } finally { setBusy(null); }
  }

  async function patch(id: string, data: any) {
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/forum/categories/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const j = await r.json();
      if (r.ok && j.category) {
        setItems(items.map((it) => it.id === id ? { ...it, ...j.category } : it));
        setEditing(null);
      } else alert(`Erreur : ${j.error}`);
    } finally { setBusy(null); }
  }

  async function remove(id: string, count: number) {
    if (count > 0) { alert(`Cette catégorie contient ${count} sujet(s). Déplace-les ou supprime-les d'abord.`); return; }
    if (!confirm('Supprimer cette catégorie ?')) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/forum/categories/${id}`, { method: 'DELETE' });
      const j = await r.json();
      if (r.ok) setItems(items.filter((it) => it.id !== id));
      else alert(`Erreur : ${j.error}`);
    } finally { setBusy(null); }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400">
          Catégories ({items.length})
        </h2>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button
              onClick={seedDefaults}
              disabled={busy === 'seed'}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            >
              {busy === 'seed' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              Seed 6 catégories GLD
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            <Plus size={11} /> {showForm ? 'Annuler' : 'Nouvelle catégorie'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-4 mb-4">
          <h3 className="font-bold mb-3 text-sm">Créer une catégorie</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Nom *</label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
                placeholder="ex: Témoignages"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Slug URL *</label>
              <input
                value={slug}
                onChange={(e) => setSlug(autoSlug(e.target.value))}
                placeholder="ex: temoignages"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1 font-mono"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Phrase courte qui apparaît sur la page forum"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Icône (emoji)</label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                maxLength={4}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-2xl mt-1 text-center"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase font-bold">Couleur d'accent</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-12 bg-zinc-950 border border-zinc-800 rounded-lg mt-1 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => create()}
              disabled={busy === 'create' || !name || !slug}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"
            >
              {busy === 'create' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Créer
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-full"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm">
          ⚠ Aucune catégorie créée. Clique sur <strong>« Seed 6 catégories GLD »</strong> ci-dessus pour démarrer rapidement,
          ou utilise <strong>« Nouvelle catégorie »</strong> pour en créer une à la main.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.sort((a, b) => a.order - b.order).map((c) => {
            const isEditing = editing === c.id;
            return (
              <div
                key={c.id}
                className="bg-zinc-900 border-2 rounded-xl p-3 transition"
                style={{ borderColor: (c.color || '#3f3f46') + '40' }}
              >
                {isEditing ? (
                  <EditRow cat={c} onSave={(d) => patch(c.id, d)} onCancel={() => setEditing(null)} busy={busy === c.id} />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-2xl">{c.icon || '📁'}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate">{c.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">/forum/{c.slug}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditing(c.id)}
                          className="text-zinc-500 hover:text-violet-400 text-[10px] underline"
                        >Édit</button>
                        <button
                          onClick={() => remove(c.id, c._count?.threads || 0)}
                          disabled={busy === c.id}
                          className="text-zinc-500 hover:text-red-400 p-0.5"
                          title="Supprimer"
                        >
                          {busy === c.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        </button>
                      </div>
                    </div>
                    {c.description && <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{c.description}</p>}
                    <div className="text-[10px] text-zinc-600 mt-2 pt-2 border-t border-white/5">
                      {c._count?.threads || 0} sujet(s) · ordre #{c.order}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EditRow({ cat, onSave, onCancel, busy }: { cat: Category; onSave: (d: any) => void; onCancel: () => void; busy: boolean }) {
  const [name, setName] = useState(cat.name);
  const [description, setDescription] = useState(cat.description || '');
  const [color, setColor] = useState(cat.color || '#a78bfa');
  const [icon, setIcon] = useState(cat.icon || '💬');
  const [order, setOrder] = useState(cat.order);
  return (
    <div className="space-y-2">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm" placeholder="Nom" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs" placeholder="Description" />
      <div className="flex gap-1">
        <input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={4} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-lg w-12 text-center" />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-8 bg-zinc-950 border border-zinc-800 rounded" />
        <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs w-16" />
      </div>
      <div className="flex gap-1">
        <button onClick={() => onSave({ name, description, color, icon, order })} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1">
          {busy ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} OK
        </button>
        <button onClick={onCancel} className="bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] px-3 py-1 rounded-full flex items-center gap-1">
          <X size={10} /> Annuler
        </button>
      </div>
    </div>
  );
}
