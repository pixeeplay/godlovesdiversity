'use client';
import { useState } from 'react';
import { Plus, Trash2, Save, ExternalLink, Eye, EyeOff } from 'lucide-react';

type Partner = {
  id: string;
  name: string;
  url: string;
  logoUrl: string | null;
  description: string | null;
  category: string | null;
  order: number;
  published: boolean;
};

export function PartnersAdmin({ initialItems }: { initialItems: Partner[] }) {
  const [items, setItems] = useState<Partner[]>(initialItems);
  const [draft, setDraft] = useState({
    name: '', url: '', logoUrl: '', description: '', category: 'Association', order: 0
  });
  const [saving, setSaving] = useState<string | null>(null);

  async function add() {
    if (!draft.name || !draft.url) { alert('Nom et URL obligatoires'); return; }
    setSaving('new');
    const r = await fetch('/api/admin/partners', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft)
    });
    if (r.ok) {
      const created = await r.json();
      setItems([...items, created]);
      setDraft({ name: '', url: '', logoUrl: '', description: '', category: 'Association', order: 0 });
    }
    setSaving(null);
  }

  async function update(p: Partner) {
    setSaving(p.id);
    await fetch(`/api/admin/partners/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p)
    });
    setSaving(null);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce partenaire ?')) return;
    await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
    setItems(items.filter((x) => x.id !== id));
  }

  function setField<K extends keyof Partner>(id: string, field: K, value: Partner[K]) {
    setItems(items.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  return (
    <div className="space-y-6">
      {/* New */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Plus size={18} /> Nouveau partenaire</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                 placeholder="Nom" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                 placeholder="URL (https://…)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <input className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                 placeholder="URL du logo (https://…)" value={draft.logoUrl} onChange={(e) => setDraft({ ...draft, logoUrl: e.target.value })} />
          <select className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
                  value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option>Association</option>
            <option>Lieu de culte</option>
            <option>Média</option>
            <option>Film</option>
            <option>Entreprise</option>
            <option>Autre</option>
          </select>
          <textarea className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm md:col-span-2" rows={2}
                    placeholder="Description (optionnel)" value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <button onClick={add} disabled={saving === 'new'}
                  className="md:col-span-2 bg-brand-pink hover:bg-pink-600 text-white font-bold rounded-lg py-2 disabled:opacity-50">
            {saving === 'new' ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-zinc-500 text-sm italic">Aucun partenaire pour l'instant.</p>
        ) : items.map((p) => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
              {p.logoUrl && (
                <img src={p.logoUrl} alt={p.name} className="md:col-span-1 max-h-12 max-w-full object-contain bg-white/5 rounded p-1" />
              )}
              <div className={`md:col-span-${p.logoUrl ? 11 : 12} grid grid-cols-1 md:grid-cols-2 gap-2`}>
                <input className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
                       value={p.name} onChange={(e) => setField(p.id, 'name', e.target.value)} placeholder="Nom" />
                <input className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
                       value={p.url} onChange={(e) => setField(p.id, 'url', e.target.value)} placeholder="URL" />
                <input className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
                       value={p.logoUrl || ''} onChange={(e) => setField(p.id, 'logoUrl', e.target.value)} placeholder="Logo URL" />
                <select className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
                        value={p.category || ''} onChange={(e) => setField(p.id, 'category', e.target.value)}>
                  <option value="">— catégorie —</option>
                  <option>Association</option>
                  <option>Lieu de culte</option>
                  <option>Média</option>
                  <option>Film</option>
                  <option>Entreprise</option>
                  <option>Autre</option>
                </select>
                <textarea className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm md:col-span-2" rows={2}
                          value={p.description || ''} onChange={(e) => setField(p.id, 'description', e.target.value)} placeholder="Description" />
                <input type="number" className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-sm"
                       value={p.order} onChange={(e) => setField(p.id, 'order', Number(e.target.value))} placeholder="Ordre" />
                <div className="flex items-center gap-2 justify-end">
                  <button onClick={() => setField(p.id, 'published', !p.published)}
                          className="px-3 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700 flex items-center gap-1">
                    {p.published ? <><Eye size={14} /> Publié</> : <><EyeOff size={14} /> Brouillon</>}
                  </button>
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                     className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"><ExternalLink size={14} /></a>
                  <button onClick={() => update(p)} disabled={saving === p.id}
                          className="px-3 py-1.5 text-xs rounded bg-brand-pink hover:bg-pink-600 text-white font-bold flex items-center gap-1 disabled:opacity-50">
                    <Save size={14} /> {saving === p.id ? '…' : 'Sauver'}
                  </button>
                  <button onClick={() => remove(p.id)}
                          className="px-2 py-1.5 text-xs rounded bg-red-900/30 hover:bg-red-900/60 text-red-300">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
