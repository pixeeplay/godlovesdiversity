'use client';
import { useEffect, useState } from 'react';
import { Loader2, Search, Plus, Trash2, Download, Check, X, Mail } from 'lucide-react';

type Sub = {
  id: string; email: string; status: string; locale: string; source: string | null;
  createdAt: string; confirmedAt: string | null;
};

const STATUSES = ['ALL', 'PENDING', 'ACTIVE', 'UNSUBSCRIBED', 'BOUNCED'];

export function SubscribersList() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newLocale, setNewLocale] = useState('fr');

  async function load() {
    setBusy(true);
    const params = new URLSearchParams();
    if (filter !== 'ALL') params.set('status', filter);
    if (search) params.set('q', search);
    const r = await fetch(`/api/admin/subscribers?${params}`);
    const j = await r.json();
    setSubs(j.subscribers || []);
    setCounts(j.counts || {});
    setBusy(false);
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, [filter]);

  async function add() {
    if (!newEmail) return;
    const r = await fetch('/api/admin/subscribers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, locale: newLocale, status: 'ACTIVE' })
    });
    if (r.ok) { setNewEmail(''); setAdding(false); load(); }
  }

  async function setStatus(s: Sub, status: string) {
    const r = await fetch(`/api/admin/subscribers/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (r.ok) setSubs((arr) => arr.map((x) => x.id === s.id ? { ...x, status } : x));
  }

  async function del(s: Sub) {
    if (!confirm(`Supprimer ${s.email} ?`)) return;
    const r = await fetch(`/api/admin/subscribers/${s.id}`, { method: 'DELETE' });
    if (r.ok) setSubs((arr) => arr.filter((x) => x.id !== s.id));
  }

  function exportCsv() {
    window.open(`/api/admin/subscribers?export=csv${filter !== 'ALL' ? `&status=${filter}` : ''}`, '_blank');
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2"><Mail size={18} className="text-brand-pink" /> Liste des abonnés</h2>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="btn-ghost text-xs">
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => setAdding(!adding)} className="btn-primary text-xs">
            <Plus size={12} /> Ajouter
          </button>
        </div>
      </div>

      {/* KPIs par statut */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['ACTIVE', 'PENDING', 'UNSUBSCRIBED', 'BOUNCED'] as const).map((st) => (
          <div key={st} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-brand-pink">{counts[st] || 0}</div>
            <div className="text-xs text-zinc-500">{st}</div>
          </div>
        ))}
      </div>

      {/* Ajout manuel */}
      {adding && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-4 flex gap-2 flex-wrap">
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 min-w-[220px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
          <select value={newLocale} onChange={(e) => setNewLocale(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            {['fr', 'en', 'es', 'pt'].map((l) => <option key={l}>{l}</option>)}
          </select>
          <button onClick={add} className="btn-primary text-sm">Ajouter</button>
          <button onClick={() => setAdding(false)} className="btn-ghost text-sm">Annuler</button>
        </div>
      )}

      {/* Filtres + recherche */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1">
          {STATUSES.map((st) => (
            <button key={st} onClick={() => setFilter(st)}
              className={`px-3 py-1 rounded-full text-xs border transition
                ${filter === st ? 'border-brand-pink text-brand-pink' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>
              {st}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Chercher un email…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-sm" />
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500">
              <th className="py-2 px-2">Email</th>
              <th className="py-2 px-2">Statut</th>
              <th className="py-2 px-2">Langue</th>
              <th className="py-2 px-2">Source</th>
              <th className="py-2 px-2">Inscrit le</th>
              <th className="py-2 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {busy && (
              <tr><td colSpan={6} className="text-center py-6 text-zinc-500"><Loader2 className="animate-spin inline" /> Chargement…</td></tr>
            )}
            {!busy && subs.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-zinc-500 italic">Aucun abonné.</td></tr>
            )}
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-zinc-800 hover:bg-zinc-950">
                <td className="py-2 px-2 font-mono text-xs">{s.email}</td>
                <td className="py-2 px-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    s.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300'
                    : s.status === 'PENDING' ? 'bg-amber-500/15 text-amber-300'
                    : s.status === 'UNSUBSCRIBED' ? 'bg-zinc-700 text-zinc-300'
                    : 'bg-red-500/15 text-red-300'
                  }`}>{s.status}</span>
                </td>
                <td className="py-2 px-2 text-zinc-400">{s.locale.toUpperCase()}</td>
                <td className="py-2 px-2 text-zinc-500 text-xs">{s.source || '—'}</td>
                <td className="py-2 px-2 text-zinc-500 text-xs">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</td>
                <td className="py-2 px-2 text-right">
                  <div className="inline-flex gap-1">
                    {s.status !== 'ACTIVE' && (
                      <button onClick={() => setStatus(s, 'ACTIVE')} title="Activer"
                        className="text-emerald-400 hover:bg-emerald-500/10 rounded p-1"><Check size={12} /></button>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => setStatus(s, 'UNSUBSCRIBED')} title="Désinscrire"
                        className="text-amber-400 hover:bg-amber-500/10 rounded p-1"><X size={12} /></button>
                    )}
                    <button onClick={() => del(s)} title="Supprimer"
                      className="text-red-400 hover:bg-red-500/10 rounded p-1"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
