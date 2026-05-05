import { SubmissionForm } from '@/components/SubmissionForm';
import { AlertTriangle } from 'lucide-react';

export const metadata = { title: 'Signalement collaboratif — GLD' };

export default function P() {
  return (
    <main className="container-wide py-12 max-w-2xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl p-3 mb-3"><AlertTriangle size={28} className="text-white" /></div>
        <h1 className="font-display font-bold text-4xl">🚩 Signaler un lieu/personne dangereux</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">Anonyme. Modéré par GLD avant publication. Aide la communauté à éviter les endroits/personnes hostiles.</p>
      </header>
      <SubmissionForm
        kind="report-place"
        successMessage="Signalement reçu. Modération sous 72h, puis ajouté à la carte d'alerte."
        fields={[
          { name: 'placeName', label: 'Nom du lieu / personne', required: true },
          { name: 'type', label: 'Type', type: 'select', required: true, options: ['Restaurant/bar', 'Lieu de culte', 'Police/admin', 'Médecin/soignant', 'Magasin/service', 'Personne (anonymisé)', 'Autre'] },
          { name: 'city', label: 'Ville', required: true },
          { name: 'country', label: 'Pays (code)', placeholder: 'FR' },
          { name: 'description', label: 'Que s\'est-il passé ?', type: 'textarea', required: true, placeholder: 'Insultes, refus de service, agression, propos haineux…' },
          { name: 'date', label: 'Date approximative', placeholder: 'Mai 2026' },
          { name: 'evidence', label: 'Preuves (URL captures, témoins)', placeholder: 'imgur.com/...' }
        ]}
        intro={
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-[11px] text-amber-200 mb-3">
            ⚠ Ne donne JAMAIS l'identité réelle d'une personne (RGPD). Pour les personnes : décris le rôle, pas le nom.
          </div>
        }
      />
    </main>
  );
}
