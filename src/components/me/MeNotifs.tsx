'use client';
import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';

const TOGGLES = [
  { k: 'notifyDigest',    label: 'Digest hebdomadaire', desc: 'Récap le dimanche : top témoignages + events' },
  { k: 'notifyEvents',    label: 'Nouveaux événements', desc: 'Quand un event est ajouté près de chez moi' },
  { k: 'notifyPeerHelp',  label: 'Réponses peer-help',  desc: 'Quand quelqu\'un soutient un message que tu as posté' },
  { k: 'notifyMentor',    label: 'Mentor 1-1',           desc: 'Match disponible / nouvelle session planifiée' },
  { k: 'notifyShop',      label: 'Boutique',              desc: 'Statut commandes, retours stock' }
];

export function MeNotifs() {
  const [u, setU] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetch('/api/me/profile').then(r => r.json()).then(j => setU(j.user)); }, []);
  if (!u) return null;

  async function save() {
    setBusy(true);
    await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    setBusy(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
      {TOGGLES.map(t => (
        <label key={t.k} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-zinc-800 cursor-pointer">
          <input type="checkbox" checked={!!u[t.k]} onChange={(e) => setU({ ...u, [t.k]: e.target.checked })} className="mt-1" />
          <div>
            <div className="font-bold text-sm">{t.label}</div>
            <div className="text-[11px] text-zinc-400">{t.desc}</div>
          </div>
        </label>
      ))}
      <button onClick={save} disabled={busy} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2 mt-3">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
      </button>
    </div>
  );
}
