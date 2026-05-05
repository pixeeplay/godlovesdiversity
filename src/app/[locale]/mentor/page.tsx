'use client';
import { useState } from 'react';
import { Users, Heart, Award } from 'lucide-react';
import { SubmissionForm } from '@/components/SubmissionForm';

export default function P() {
  const [role, setRole] = useState<'mentee' | 'mentor'>('mentee');
  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3"><Users size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">Mentorat 1-1</h1>
        <p className="text-zinc-400 text-sm mt-2">Matching anonyme jeune ↔ ainé·e LGBT pour 4 conversations Zoom (1h).</p>
      </header>
      <div className="flex justify-center gap-2 mb-5">
        <button onClick={() => setRole('mentee')} className={`px-4 py-2 rounded-full text-sm font-bold ${role === 'mentee' ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>🌱 Je cherche un·e mentor·e</button>
        <button onClick={() => setRole('mentor')} className={`px-4 py-2 rounded-full text-sm font-bold ${role === 'mentor' ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>👵 Je veux mentorer</button>
      </div>
      <SubmissionForm
        kind={role === 'mentee' ? 'mentor-mentee' : 'mentor-mentor'}
        successMessage="Inscription reçue. On te matchera sous 7 jours."
        fields={[
          { name: 'name', label: 'Pseudo', required: true },
          { name: 'email', label: 'Email (pour le match)', type: 'email', required: true },
          { name: 'age', label: role === 'mentee' ? 'Ton âge' : 'Ton âge (idéalement 35+)', type: 'number' },
          { name: 'identity', label: 'Identité (libre)', placeholder: 'ex: gay, lesbienne, trans, non-binaire, en questionnement…' },
          { name: 'topics', label: 'Sujets à aborder', type: 'textarea', placeholder: 'Coming-out, foi, famille, couple, trans, asile…' },
          { name: 'languages', label: 'Langues parlées', placeholder: 'FR, EN…' },
          { name: 'city', label: 'Ville (timezone)' }
        ]}
      />
    </main>
  );
}
