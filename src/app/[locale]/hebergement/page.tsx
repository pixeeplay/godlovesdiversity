'use client';
import { useState } from 'react';
import { Home, Heart } from 'lucide-react';
import { SubmissionForm } from '@/components/SubmissionForm';

export default function P() {
  const [role, setRole] = useState<'host' | 'guest'>('guest');
  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-cyan-500 to-emerald-600 rounded-2xl p-3 mb-3"><Home size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">🏠 Hébergement d'urgence</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">Réseau communautaire : un·e LGBT en danger trouve un canapé 1-3 nuits chez un·e hôte vérifié·e.</p>
      </header>
      <div className="flex justify-center gap-2 mb-5">
        <button onClick={() => setRole('guest')} className={`px-4 py-2 rounded-full text-sm font-bold ${role === 'guest' ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>🆘 J'ai besoin d'un toit</button>
        <button onClick={() => setRole('host')} className={`px-4 py-2 rounded-full text-sm font-bold ${role === 'host' ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>💝 Je propose un canapé</button>
      </div>
      {role === 'guest' ? (
        <SubmissionForm
          kind="shelter-guest"
          successMessage="Demande reçue — mise en relation sous 24h. Pour danger immédiat : 112 ou Le Refuge 06 31 59 69 50."
          fields={[
            { name: 'name', label: 'Pseudo (anonymisé public)', required: true },
            { name: 'email', label: 'Email contact', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel' },
            { name: 'city', label: 'Ville où tu dois être hébergé', required: true },
            { name: 'people', label: 'Combien de personnes', type: 'number', placeholder: '1' },
            { name: 'duration', label: 'Combien de nuits (max 3)', type: 'select', options: ['1', '2', '3'] },
            { name: 'why', label: 'Situation (libre)', type: 'textarea', required: true, placeholder: 'Sans jugement. Plus tu détailles, mieux on matche.' }
          ]}
        />
      ) : (
        <SubmissionForm
          kind="shelter-host"
          successMessage="Inscription hôte reçue. Vérification d'identité sous 7 jours puis ajout au réseau."
          fields={[
            { name: 'name', label: 'Prénom + nom (vérifié)', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'phone', label: 'Téléphone', type: 'tel', required: true },
            { name: 'city', label: 'Ville', required: true },
            { name: 'capacity', label: 'Combien de personnes max', type: 'number', placeholder: '1' },
            { name: 'duration', label: 'Durée max acceptée', type: 'select', options: ['1 nuit', '2 nuits', '3 nuits', '1 semaine+'] },
            { name: 'pets', label: 'Animaux acceptés ?', type: 'select', options: ['Oui', 'Non', 'Selon'] },
            { name: 'rules', label: 'Règles ou précisions', type: 'textarea' },
            { name: 'verify', label: 'Pièce d\'identité (URL upload privé)', placeholder: 'On te contactera pour t\'envoyer un lien sécurisé' }
          ]}
        />
      )}
    </main>
  );
}
