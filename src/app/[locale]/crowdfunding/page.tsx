'use client';
import { useEffect, useState } from 'react';
import { Coins, Plus, ExternalLink } from 'lucide-react';
import { SubmissionForm } from '@/components/SubmissionForm';

export default function P() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => { fetch('/api/submissions?kind=crowdfunding-project').then(r => r.json()).then(j => setItems(j.items || [])); }, []);
  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-4xl">💰 Crowdfunding LGBT</h1>
          <p className="text-zinc-400 text-sm mt-1">Court-métrages, livres, assos, projets communautaires à soutenir</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5"><Plus size={14} /> Lancer mon projet</button>
      </header>
      {showForm && (
        <div className="mb-5">
          <SubmissionForm kind="crowdfunding-project" successMessage="Projet reçu — validation 7j puis publié."
            fields={[
              { name: 'title', label: 'Titre projet', required: true },
              { name: 'name', label: 'Porteur·euse', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'campaignUrl', label: 'URL Ulule/KissKiss/HelloAsso/GoFundMe', type: 'url', required: true },
              { name: 'goal', label: 'Objectif (€)', type: 'number' },
              { name: 'category', label: 'Type', type: 'select', options: ['Film/vidéo', 'Livre/BD', 'Asso', 'Tech', 'Art', 'Autre'] },
              { name: 'description', label: 'Pourquoi ce projet ?', type: 'textarea' },
              { name: 'image', label: 'URL image projet', type: 'url' },
              { name: 'deadline', label: 'Date fin campagne' }
            ]} />
        </div>
      )}
      {items.length === 0 ? <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400"><Coins size={32} className="mx-auto mb-2 opacity-30" />Aucun projet en cours.</div>
        : <div className="grid sm:grid-cols-2 gap-3">{items.map(it => (
            <article key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {it.data.image && <img src={it.data.image} alt="" className="w-full aspect-video object-cover" />}
              <div className="p-4">
                <div className="text-[10px] uppercase font-bold text-fuchsia-400">{it.data.category}</div>
                <div className="font-bold text-base mt-1">{it.data.title}</div>
                <div className="text-[11px] text-zinc-400">par {it.authorName}</div>
                <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{it.data.description}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                  <div className="text-[11px] text-zinc-400">🎯 {it.data.goal}€{it.data.deadline && ` · ⏳ ${it.data.deadline}`}</div>
                  <a href={it.data.campaignUrl} target="_blank" rel="noopener noreferrer" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"><ExternalLink size={11} /> Soutenir</a>
                </div>
              </div>
            </article>))}</div>}
    </main>
  );
}
