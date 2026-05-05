'use client';
import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Trash2, Save, Phone, Heart, Check } from 'lucide-react';

type Contact = { name: string; phone: string; relation: string };

export function EmergencyContactsClient() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('gld_emergency_contacts');
      if (raw) setContacts(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(list: Contact[]) {
    setContacts(list);
    localStorage.setItem('gld_emergency_contacts', JSON.stringify(list));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addContact() {
    if (contacts.length >= 5) return;
    persist([...contacts, { name: '', phone: '', relation: 'ami·e' }]);
  }

  function update(i: number, field: keyof Contact, value: string) {
    const next = [...contacts];
    next[i] = { ...next[i], [field]: value };
    persist(next);
  }

  function remove(i: number) {
    persist(contacts.filter((_, x) => x !== i));
  }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="mb-6">
        <div className="inline-flex items-center gap-3 mb-3">
          <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-3 shadow-lg shadow-red-500/30">
            <ShieldAlert size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-3xl">Mes contacts d'urgence</h1>
            <p className="text-zinc-400 text-sm">Quand tu déclenches l'alarme SOS, on envoie un SMS automatique avec ta géolocalisation.</p>
          </div>
        </div>
      </header>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 mb-5">
        🔒 Tes contacts sont stockés <strong>uniquement dans ton navigateur</strong> (localStorage). Ils ne sont jamais envoyés à GLD ni à un serveur. Ils restent privés.
      </div>

      <div className="space-y-3">
        {contacts.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
            <Heart size={32} className="mx-auto mb-2 text-red-400" />
            Aucun contact configuré.<br/>
            Ajoute jusqu'à <strong>5 personnes</strong> de confiance qui seront alertées.
          </div>
        )}
        {contacts.map((c, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="grid sm:grid-cols-[1fr_1fr_120px_40px] gap-2">
              <input value={c.name} onChange={(e) => update(i, 'name', e.target.value)} placeholder="Prénom Nom" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
              <input value={c.phone} onChange={(e) => update(i, 'phone', e.target.value)} placeholder="+33 6 12 34 56 78" type="tel" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
              <select value={c.relation} onChange={(e) => update(i, 'relation', e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-sm">
                <option value="ami·e">Ami·e</option>
                <option value="famille">Famille</option>
                <option value="couple">Couple/conjoint·e</option>
                <option value="thérapeute">Thérapeute</option>
                <option value="avocat·e">Avocat·e</option>
                <option value="autre">Autre</option>
              </select>
              <button onClick={() => remove(i)} className="text-zinc-500 hover:text-red-400 p-2"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {contacts.length < 5 && (
          <button onClick={addContact} className="w-full bg-zinc-900 hover:bg-zinc-800 border-2 border-dashed border-zinc-700 hover:border-fuchsia-500/40 rounded-2xl p-4 text-zinc-400 text-sm font-bold flex items-center justify-center gap-2 transition">
            <Plus size={14} /> Ajouter un contact ({contacts.length}/5)
          </button>
        )}
      </div>

      {saved && (
        <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5 text-xs text-emerald-200 flex items-center gap-2">
          <Check size={14} /> Sauvegardé dans ton navigateur
        </div>
      )}

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Phone size={14} className="text-fuchsia-400" /> Comment ça marche ?</h3>
        <ol className="text-xs text-zinc-300 space-y-1 list-decimal list-inside">
          <li>Tu fais un appui long sur le bouton <strong>SOS</strong> (1.2s)</li>
          <li>L'alarme s'active : sirène + voix d'alerte</li>
          <li><strong>En parallèle</strong>, on ouvre l'app SMS de ton téléphone avec un message pré-rempli pour ton premier contact :<br/>
            <em className="text-zinc-400">"🚨 URGENCE — j'ai déclenché l'alarme GLD. Position : maps.google.com/?q=…"</em></li>
          <li>Tu n'as qu'à confirmer l'envoi (1 tap)</li>
        </ol>
        <p className="text-[10px] text-zinc-500 mt-2">⚠ Limite technique : un seul SMS peut être pré-rempli automatiquement (premier de la liste). Pour les autres, tu peux les copier-coller depuis ton historique.</p>
      </div>
    </main>
  );
}
