'use client';
import { useEffect, useState } from 'react';
import { MapPin, Plus, Calendar } from 'lucide-react';
import { SubmissionForm } from '@/components/SubmissionForm';

export default function P() {
  const [items, setItems] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/submissions?kind=meetup-organizer')
      .then(r => r.json()).then(j => setItems(j.items || []));
  }, []);

  return (
    <main className="container-wide py-12 max-w-4xl">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-4xl">📍 Rencontres IRL</h1>
          <p className="text-zinc-400 text-sm mt-1">Apéros, marches, cafés théologiques GLD près de chez toi</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
          <Plus size={14} /> Organiser
        </button>
      </header>

      {showForm && (
        <div className="mb-6">
          <SubmissionForm
            kind="meetup-organizer"
            successMessage="Meetup proposé. Validation admin sous 48h, puis publié."
            fields={[
              { name: 'name', label: 'Ton pseudo', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'title', label: 'Titre du meetup', required: true, placeholder: 'Apéro queer du 15' },
              { name: 'city', label: 'Ville', required: true },
              { name: 'date', label: 'Date + heure', required: true, placeholder: '15 mai 19h' },
              { name: 'place', label: 'Lieu (bar/café/parc)', required: true },
              { name: 'description', label: 'Description', type: 'textarea' },
              { name: 'maxPeople', label: 'Nombre max', type: 'number', placeholder: '20' }
            ]}
          />
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
          <Calendar size={32} className="mx-auto mb-2 opacity-30" />
          Aucun meetup encore. Sois le·la premier·e à en organiser !
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map(it => (
            <article key={it.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="font-bold text-base">{it.data.title}</div>
              <div className="text-xs text-zinc-400 mt-1">📅 {it.data.date} · 📍 {it.data.place}, {it.city}</div>
              {it.data.description && <p className="text-xs text-zinc-300 mt-2">{it.data.description}</p>}
              <div className="text-[10px] text-zinc-400 mt-2">Par {it.authorName} · max {it.data.maxPeople || '?'} pers.</div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
