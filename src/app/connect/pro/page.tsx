'use client';
import { useState } from 'react';
import { Search, ShieldCheck, Briefcase, MapPin, Star, MessageCircle, Calendar, Plus } from 'lucide-react';
import { MOCK_PRO_DIRECTORY, getUser, MOCK_USERS } from '@/lib/connect-mock';

const CATEGORIES = [
  { id: 'all',         label: 'Tous',                emoji: '✨' },
  { id: 'pasteur',     label: 'Pasteurs / Aumôniers',emoji: '⛪' },
  { id: 'therapeute',  label: 'Thérapeutes',         emoji: '🧠' },
  { id: 'avocat',      label: 'Avocats famille',     emoji: '⚖️' },
  { id: 'coach',       label: 'Coachs',              emoji: '🎤' },
  { id: 'photographe', label: 'Photographes',        emoji: '📸' },
  { id: 'lieu',        label: 'Lieux pros',          emoji: '🏪' }
];

export default function ProPage() {
  const [cat, setCat] = useState('all');
  const filtered = cat === 'all' ? MOCK_PRO_DIRECTORY : MOCK_PRO_DIRECTORY.filter((p) => p.category === cat);

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-5">
      {/* SIDEBAR : profil + catégories */}
      <aside className="space-y-3">
        {/* Profil pro perso */}
        <div className="backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-2xl overflow-hidden sticky top-32">
          <div className="h-20 bg-gradient-to-br from-sky-500 to-cyan-500" />
          <div className="px-4 pb-4 -mt-10 text-center">
            <div className="w-20 h-20 mx-auto rounded-full border-4 border-zinc-950 bg-gradient-to-br from-sky-400 to-violet-600 grid place-items-center text-xl font-bold">A</div>
            <h3 className="font-bold mt-2">Arnaud Gredai</h3>
            <p className="text-[11px] text-zinc-400">Fondateur GLD · Allié-père</p>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10 text-center">
              <div><div className="text-sm font-bold">142</div><div className="text-[9px] text-zinc-500">Connexions</div></div>
              <div><div className="text-sm font-bold">28</div><div className="text-[9px] text-zinc-500">Vues</div></div>
              <div><div className="text-sm font-bold">5</div><div className="text-[9px] text-zinc-500">Recos</div></div>
            </div>
            <a href="/connect/onboard" className="block text-center w-full mt-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold py-2 rounded-full">
              + Compléter mon CV
            </a>
          </div>
        </div>

        {/* Catégories */}
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-3">
          <h3 className="text-xs font-bold text-zinc-300 mb-2 px-1">Catégories</h3>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 transition ${
                cat === c.id ? 'bg-sky-500/20 text-sky-200 font-bold' : 'text-zinc-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <span className="text-base">{c.emoji}</span>
              <span className="flex-1">{c.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* CONTENU */}
      <div className="space-y-4">
        {/* Search bar + post offer */}
        <div className="flex gap-3">
          <div className="flex-1 backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-2">
            <Search size={14} className="text-zinc-400" />
            <input
              placeholder="Rechercher un pro, un service, une compétence…"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-zinc-500"
            />
          </div>
          <button onClick={() => {
            const title = prompt('Titre de ton opportunité (ex: Recherche photographe mariage Lyon) :');
            if (!title) return;
            const budget = prompt('Budget approximatif (optionnel) :') || '';
            alert('Opportunité prête à publier (feature opportunités à brancher en Phase 2). Pour l\'instant, partage-la dans le mur Communauté → /connect/mur');
          }} className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold text-xs px-4 rounded-2xl flex items-center gap-1.5">
            <Plus size={12} /> Poster une opportunité
          </button>
        </div>

        {/* Annonce d'opportunité */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-400/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💼</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm">Recherche photographe pour mariage interreligieux — Lyon, sept. 2026</h3>
              <p className="text-xs text-zinc-300 mt-1">Posté par Léa · 18 candidatures · Budget 1500-2500€</p>
              <button onClick={() => {
                const msg = prompt('Ton message de candidature :');
                if (!msg) return;
                alert('✓ Candidature enregistrée localement. Pour le contact réel, le porteur d\'offre te contactera via Messagerie.');
              }} className="mt-3 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-400/30">
                Candidater
              </button>
            </div>
          </div>
        </div>

        {/* Annuaire pros */}
        {filtered.map((p) => <ProCard key={p.userHandle} record={p} />)}

        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 py-12 backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-2xl">
            Aucun pro dans cette catégorie pour l'instant.
          </div>
        )}

        {/* Suggestions de connexion */}
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-4">
          <h3 className="text-xs font-bold text-zinc-300 mb-3">Membres pros à découvrir</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {MOCK_USERS.filter(u => u.verified).slice(0, 4).map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-2 bg-white/[0.04] rounded-xl">
                <div className="w-12 h-12 rounded-full" style={{ background: `linear-gradient(135deg, ${u.avatarColor[0]}, ${u.avatarColor[1]})` }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{u.name}</div>
                  <div className="text-[10px] text-zinc-400 truncate">{u.identity} · {u.city}</div>
                </div>
                <button className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 text-[10px] font-bold px-2 py-1 rounded-full border border-sky-400/30">
                  + Connecter
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-zinc-500 py-4 border border-dashed border-white/10 rounded-2xl">
          ✨ MVP démo — contenu mock effaçable depuis <code className="text-sky-300">/admin/connect</code>
        </div>
      </div>
    </div>
  );
}

function ProCard({ record }: { record: any }) {
  const u = getUser(record.userHandle);
  if (!u) return null;
  return (
    <article className="backdrop-blur-2xl bg-white/[0.05] border border-white/10 rounded-2xl p-4 hover:bg-white/[0.07] transition-all">
      <div className="flex gap-4">
        <div className="w-14 h-14 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${u.avatarColor[0]}, ${u.avatarColor[1]})` }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-1.5 flex-wrap">
                {u.name}
                {u.verified && <ShieldCheck size={12} className="text-emerald-400" />}
              </h3>
              <p className="text-[11px] text-zinc-400">{record.jobTitle}</p>
            </div>
            <span className="text-[10px] font-bold bg-sky-500/20 text-sky-200 px-2 py-1 rounded-full border border-sky-400/30 whitespace-nowrap">
              {record.categoryLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-400 mb-2">
            <span className="flex items-center gap-1"><MapPin size={9} /> {u.city}</span>
            <span className="flex items-center gap-1"><Star size={9} className="text-amber-400" /> Recommandé par {record.recommendations} membres</span>
            {record.available && <span className="text-emerald-300 font-bold">● Disponible</span>}
          </div>
          {record.badge && (
            <span className="inline-block text-[10px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30 mb-2">
              {record.badge}
            </span>
          )}
          <p className="text-xs text-zinc-200 leading-relaxed mb-3">{record.pitch}</p>
          <ProActions userId={u.id} userName={u.name} userEmail={(u as any).email} />
        </div>
      </div>
    </article>
  );
}

function ProActions({ userId, userName, userEmail }: { userId: string; userName: string; userEmail?: string }) {
  const [connecting, setConnecting] = useState(false);
  const [done, setDone] = useState(false);
  async function connect() {
    setConnecting(true);
    const r = await fetch('/api/connect/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: userId, message: `Bonjour ${userName}, je souhaite me connecter avec vous via GLD.` })
    }).catch(() => ({ ok: false } as any));
    setConnecting(false);
    if ((r as any).ok) setDone(true);
    else alert('Impossible — connecte-toi d\'abord ou réessaie plus tard');
  }
  return (
    <div className="flex gap-2">
      <button onClick={connect} disabled={connecting || done} className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${done ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-100' : 'bg-sky-500/30 hover:bg-sky-500/40 text-sky-100 border-sky-400/40'} disabled:opacity-50`}>
        <Plus size={10} /> {done ? 'Demande envoyée ✓' : connecting ? 'Envoi…' : 'Se connecter'}
      </button>
      <a href="/connect/messages" className="bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-[11px] font-bold px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
        <MessageCircle size={10} /> Message
      </a>
      <a href={userEmail ? `mailto:${userEmail}?subject=Demande%20de%20RDV%20via%20GLD` : '#'} onClick={(e) => { if (!userEmail) { e.preventDefault(); alert('Le pro n\'a pas renseigné d\'email — passe par Messagerie pour demander un RDV'); } }} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[11px] font-bold px-3 py-1.5 rounded-full border border-emerald-400/30 flex items-center gap-1.5">
        <Calendar size={10} /> Prendre RDV
      </a>
    </div>
  );
}
