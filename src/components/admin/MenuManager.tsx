'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, ArrowUp, ArrowDown, Eye, EyeOff, Languages, ExternalLink, Sparkles, RotateCcw } from 'lucide-react';

type Item = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  parentId: string | null;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export function MenuManager({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [seeding, setSeeding] = useState<'add' | 'reset' | null>(null);

  async function seedDefaults(wipe: boolean) {
    if (wipe && !confirm('Effacer TOUS les éléments du menu actuel et réinitialiser au menu par défaut GLD ? Cette action est irréversible.')) return;
    if (!wipe && !confirm('Ajouter les éléments manquants du menu par défaut GLD (Le Message, Argumentaire, Communauté, Agenda, etc.) sans toucher aux items custom existants ? Les doublons par URL seront automatiquement nettoyés.')) return;
    setSeeding(wipe ? 'reset' : 'add');
    try {
      const r = await fetch('/api/admin/menu/seed-defaults', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipe })
      });
      const j = await r.json();
      if (r.ok) {
        alert(`✅ Menu mis à jour\n\n${j.stats.created} créés · ${j.stats.deduped} doublons supprimés · ${j.stats.kept} conservés${wipe ? ` · ${j.stats.deleted} effacés` : ''}\n\nRecharge la page pour voir les changements.`);
        window.location.reload();
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setSeeding(null); }
  }

  const tops = items.filter((i) => !i.parentId).sort((a, b) => a.order - b.order);
  const childrenOf = (id: string) => items.filter((i) => i.parentId === id).sort((a, b) => a.order - b.order);

  async function move(it: Item, dir: 1 | -1) {
    const siblings = items.filter((x) => x.parentId === it.parentId).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((x) => x.id === it.id);
    const target = siblings[idx + dir];
    if (!target) return;
    await Promise.all([
      fetch(`/api/admin/menu/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: target.order }) }),
      fetch(`/api/admin/menu/${target.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order: it.order }) })
    ]);
    setItems((arr) => arr.map((x) => {
      if (x.id === it.id) return { ...x, order: target.order };
      if (x.id === target.id) return { ...x, order: it.order };
      return x;
    }));
  }

  async function togglePub(it: Item) {
    const r = await fetch(`/api/admin/menu/${it.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !it.published })
    });
    if (r.ok) setItems((arr) => arr.map((x) => x.id === it.id ? { ...x, published: !it.published } : x));
  }

  async function del(it: Item) {
    if (!confirm(`Supprimer "${it.label}" ${childrenOf(it.id).length ? '(et ses sous-menus)' : ''} ?`)) return;
    const r = await fetch(`/api/admin/menu/${it.id}`, { method: 'DELETE' });
    if (r.ok) setItems((arr) => arr.filter((x) => x.id !== it.id && x.parentId !== it.id));
  }

  async function translateAll() {
    if (!confirm('Cloner tout le menu FR en EN/ES/PT via IA ?')) return;
    setTranslating(true);
    await fetch('/api/admin/menu/translate', { method: 'POST' });
    setTranslating(false);
    alert('Menu traduit ✅');
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => seedDefaults(false)}
            disabled={!!seeding}
            className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            title="Ajoute les éléments manquants (Communauté, Agenda…) sans toucher au reste, et nettoie les doublons"
          >
            {seeding === 'add' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Seed menu défaut GLD
          </button>
          <button
            onClick={() => seedDefaults(true)}
            disabled={!!seeding}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            title="Efface TOUT et réinitialise au menu par défaut canonique"
          >
            {seeding === 'reset' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
            Reset complet
          </button>
          <button onClick={translateAll} disabled={translating} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            {translating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
            Traduire tout en EN/ES/PT (IA)
          </button>
        </div>
        <button onClick={() => setCreating({ parentId: null })} className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Plus size={12} /> Nouvel élément
        </button>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5 mb-4 text-[11px] text-blue-200">
        💡 <strong>Photos</strong> et <strong>Boutique</strong> ne sont volontairement PAS dans cette liste : ils sont gérés par les mega-menus interactifs de la navbar (avec preview live des produits/photos).
        Si tu vois des doublons "Photos" ou "Boutique", clique <strong>« Seed menu défaut GLD »</strong> ci-dessus pour les supprimer.
      </div>

      <div className="space-y-2">
        {tops.length === 0 && <p className="text-zinc-500 italic text-center py-12 border border-dashed border-zinc-800 rounded-xl">Aucun élément.</p>}
        {tops.map((it, i) => {
          const subs = childrenOf(it.id);
          return (
            <div key={it.id}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-5">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-sm tracking-wider">{it.label}</span>
                    {it.external && <ExternalLink size={11} className="text-zinc-500" />}
                  </div>
                  <code className="text-xs text-zinc-500">{it.href}</code>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded ${it.published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {it.published ? 'En ligne' : 'Brouillon'}
                </span>
                <button onClick={() => move(it, -1)} disabled={i === 0} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => move(it, 1)} disabled={i === tops.length - 1} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => setCreating({ parentId: it.id })} className="text-zinc-400 hover:text-brand-pink p-1" title="Ajouter sous-menu"><Plus size={14} /></button>
                <button onClick={() => setEditing(it)} className="text-zinc-400 hover:text-white p-1"><Pencil size={14} /></button>
                <button onClick={() => togglePub(it)} className="text-zinc-400 hover:text-white p-1">
                  {it.published ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => del(it)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={14} /></button>
              </div>
              {subs.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {subs.map((sub, si) => (
                    <div key={sub.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                      <span className="text-xs text-zinc-600">↳</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{sub.label}</div>
                        <code className="text-xs text-zinc-600">{sub.href}</code>
                      </div>
                      <button onClick={() => move(sub, -1)} disabled={si === 0} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowUp size={12} /></button>
                      <button onClick={() => move(sub, 1)} disabled={si === subs.length - 1} className="text-zinc-400 hover:text-white p-1 disabled:opacity-30"><ArrowDown size={12} /></button>
                      <button onClick={() => setEditing(sub)} className="text-zinc-400 hover:text-white p-1"><Pencil size={12} /></button>
                      <button onClick={() => del(sub)} className="text-red-400 hover:text-red-300 p-1"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <ItemEditor
          item={editing}
          parentId={creating?.parentId ?? null}
          onClose={() => { setEditing(null); setCreating(null); }}
          onSaved={(it) => {
            setItems((arr) => {
              const idx = arr.findIndex((x) => x.id === it.id);
              return idx === -1 ? [...arr, it] : arr.map((x) => x.id === it.id ? it : x);
            });
            setEditing(null); setCreating(null);
          }}
        />
      )}
    </>
  );
}

function ItemEditor({ item, parentId, onClose, onSaved }: {
  item: Item | null; parentId: string | null; onClose: () => void; onSaved: (i: Item) => void;
}) {
  const [label, setLabel] = useState(item?.label || '');
  const [href, setHref] = useState(item?.href || '');
  const [external, setExternal] = useState(item?.external || false);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const url = item ? `/api/admin/menu/${item.id}` : '/api/admin/menu';
    const method = item ? 'PATCH' : 'POST';
    const r = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, href, external, parentId: item?.parentId ?? parentId })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) onSaved(j.item);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">{item ? 'Éditer' : (parentId ? 'Nouveau sous-menu' : 'Nouvel élément')}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <label className="block text-xs text-zinc-400">Libellé
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="THE MESSAGE"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold" />
          </label>
          <label className="block text-xs text-zinc-400">URL ou chemin
            <input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/message ou https://…"
              className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} />
            Lien externe (ouvre dans un nouvel onglet)
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost text-sm">Annuler</button>
          <button onClick={save} disabled={busy || !label || !href} className="btn-primary text-sm">
            {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
