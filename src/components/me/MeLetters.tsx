'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, Mail, Save, Calendar } from 'lucide-react';

const PRESET_DATES = [
  { label: 'Dans 1 semaine', days: 7 },
  { label: 'Dans 1 mois', days: 30 },
  { label: 'Dans 6 mois', days: 180 },
  { label: 'Dans 1 an', days: 365 },
  { label: 'Dans 5 ans', days: 1825 }
];

export function MeLetters() {
  const [letters, setLetters] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch('/api/me/letters'); const j = await r.json();
    setLetters(j.letters || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.content || !editing.deliveryDate) return;
    setBusy(true);
    try {
      await fetch('/api/me/letters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
      setEditing(null);
      await load();
    } finally { setBusy(false); }
  }

  function presetDate(days: number) {
    const d = new Date(); d.setDate(d.getDate() + days);
    setEditing({ ...editing, deliveryDate: d.toISOString().slice(0, 10) });
  }

  if (editing) return (
    <div className="bg-zinc-900 border border-pink-500/30 rounded-2xl p-5 space-y-3">
      <input value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} placeholder="Sujet (ex: Bonjour mon moi du futur)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-base font-bold" />
      <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={10} placeholder="Cher·e moi du futur,\n\nQuand tu liras cette lettre, j'espère que tu auras…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      <div>
        <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Quand veux-tu la recevoir ?</span>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_DATES.map(p => <button key={p.days} onClick={() => presetDate(p.days)} className="text-[11px] px-2.5 py-1.5 rounded-full bg-pink-500/15 hover:bg-pink-500/25 text-pink-200">{p.label}</button>)}
        </div>
        <input type="date" value={editing.deliveryDate || ''} onChange={(e) => setEditing({ ...editing, deliveryDate: e.target.value })} min={new Date().toISOString().slice(0, 10)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !editing.content || !editing.deliveryDate} className="bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Programmer la lettre
        </button>
        <button onClick={() => setEditing(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Annuler</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 text-xs text-pink-200 flex items-start gap-2">
        <Mail size={14} className="shrink-0 mt-0.5" />
        <span><strong>Lettre programmée</strong> à toi-même. Elle sera envoyée par email à la date choisie. Idéal pour célébrer un anniversaire de coming-out, fixer une intention, te rappeler ta force.</span>
      </div>
      <button onClick={() => setEditing({ content: '', subject: '', deliveryDate: '' })} className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
        <Plus size={14} /> Écrire une lettre à mon futur moi
      </button>
      {letters.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
          <Mail size={32} className="mx-auto mb-2 opacity-30" />
          Aucune lettre programmée.
        </div>
      ) : (
        <div className="space-y-2">
          {letters.map(l => {
            const days = Math.ceil((new Date(l.deliveryDate).getTime() - Date.now()) / 86400000);
            return (
              <article key={l.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{l.subject || 'Sans sujet'}</div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.delivered ? 'bg-emerald-500/20 text-emerald-300' : days <= 7 ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-300'}`}>
                    {l.delivered ? '✓ Envoyée' : days <= 0 ? 'En cours' : `Dans ${days}j`}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 mb-2"><Calendar size={10} className="inline mr-1" />Réception : {new Date(l.deliveryDate).toLocaleDateString('fr-FR')}</div>
                <p className="text-xs text-zinc-300 line-clamp-3 whitespace-pre-wrap">{l.content}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
