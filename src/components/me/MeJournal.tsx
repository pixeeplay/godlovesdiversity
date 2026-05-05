'use client';
import { useEffect, useState } from 'react';
import { Loader2, Plus, BookOpen, Trash2, Save, Lock } from 'lucide-react';

const MOODS = ['😊 joyeux', '😢 triste', '😰 anxieux', '🥹 fier', '✨ espoir', '😡 colère', '😌 paisible', '🌧 mélancolique'];

export function MeJournal() {
  const [entries, setEntries] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch('/api/me/journal'); const j = await r.json();
    setEntries(j.entries || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing.content) return;
    setBusy(true);
    try {
      await fetch('/api/me/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) });
      setEditing(null);
      await load();
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette entrée du journal ?')) return;
    await fetch(`/api/me/journal?id=${id}`, { method: 'DELETE' });
    await load();
  }

  if (editing) return (
    <div className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-5 space-y-3">
      <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Titre (optionnel)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-base font-bold" />
      <textarea value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })} rows={10} placeholder="Écris ce que tu ressens. Personne d'autre ne lira ceci. Jamais." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      <div>
        <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Humeur</span>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map(m => <button key={m} onClick={() => setEditing({ ...editing, mood: m })} className={`text-xs px-2 py-1 rounded-full ${editing.mood === m ? 'bg-violet-500 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-300'}`}>{m}</button>)}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={busy || !editing.content} className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauver
        </button>
        <button onClick={() => setEditing(null)} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Annuler</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 text-xs text-violet-200 flex items-start gap-2">
        <Lock size={14} className="shrink-0 mt-0.5" />
        <span><strong>100% privé.</strong> Tes entrées sont stockées chiffrées, visibles seulement par toi. Personne (pas même l'admin GLD) ne peut les lire.</span>
      </div>
      <button onClick={() => setEditing({ content: '', mood: '', title: '' })} className="bg-violet-500 hover:bg-violet-600 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
        <Plus size={14} /> Nouvelle entrée
      </button>
      {entries.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
          <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
          Aucune entrée. Commence par écrire 1 ligne sur ce que tu ressens aujourd'hui.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <article key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  {e.title && <div className="font-bold text-sm">{e.title}</div>}
                  <div className="text-[10px] text-zinc-400">{new Date(e.createdAt).toLocaleString('fr-FR')} {e.mood && `· ${e.mood}`}</div>
                </div>
                <button onClick={() => del(e.id)} className="text-zinc-500 hover:text-red-400"><Trash2 size={12} /></button>
              </div>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{e.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
