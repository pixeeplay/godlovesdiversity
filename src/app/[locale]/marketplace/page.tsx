'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';
import { SubmissionForm } from '@/components/SubmissionForm';

export default function P() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { fetch('/api/submissions?kind=marketplace-artisan').then(r => r.json()).then(j => setItems(j.items || [])); }, []);
  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-4xl">🛍 Marketplace artisans LGBT</h1>
          <p className="text-zinc-400 text-sm mt-1">Créateur·rices indépendant·es de la communauté</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5"><Plus size={14} /> Proposer ma boutique</button>
      </header>
      {showForm && (
        <div className="mb-5">
          <SubmissionForm kind="marketplace-artisan" successMessage="Reçu — validation sous 7j puis ajout au marketplace."
            fields={[
              { name: 'name', label: 'Nom artiste/marque', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'shopUrl', label: 'URL ta boutique (Etsy, site, Insta…)', type: 'url', required: true },
              { name: 'category', label: 'Catégorie', type: 'select', required: true, options: ['Bijoux', 'Vêtements', 'Art', 'Livres', 'Déco', 'Cosmétique', 'Autre'] },
              { name: 'description', label: 'Description courte', type: 'textarea' },
              { name: 'image', label: 'URL image vitrine', type: 'url' }
            ]} />
        </div>
      )}
      {items.length === 0 ? <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400"><ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />Aucun artisan référencé.</div>
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{items.map(it => (
            <a key={it.id} href={it.data.shopUrl} target="_blank" rel="noopener noreferrer" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden">
              {it.data.image && <img src={it.data.image} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-3"><div className="font-bold text-sm">{it.data.name}</div><div className="text-[10px] text-fuchsia-400">{it.data.category}</div><p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{it.data.description}</p></div>
            </a>))}</div>}
    </main>
  );
}
