'use client';
import { useState, useEffect } from 'react';
import { Trash2, Sparkles, Eye, EyeOff, Users, Heart, Briefcase, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';

export default function ConnectAdminPage() {
  const [showMock, setShowMock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(j => {
      const v = j.settings?.['connect.showMockData'];
      if (v === 'false') setShowMock(false);
    });
  }, []);

  async function toggleMock() {
    setBusy(true);
    const next = !showMock;
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'connect.showMockData': next ? 'true' : 'false' })
    });
    setShowMock(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setBusy(false);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-sky-500 grid place-items-center">
          <Sparkles size={18} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">GLD Connect — Réseau social</h1>
          <p className="text-sm text-zinc-400">3 modes en 1 : Communauté · Rencontres · Pro</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 my-5">
        <a href="/connect/mur" target="_blank" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-fuchsia-500/50 transition group">
          <Users size={20} className="text-fuchsia-400 mb-2" />
          <div className="font-bold text-sm">Mode Communauté</div>
          <div className="text-[11px] text-zinc-500">Mur, posts, prières</div>
          <div className="text-[10px] text-fuchsia-300 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">Voir <ExternalLink size={9} /></div>
        </a>
        <a href="/connect/rencontres" target="_blank" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-rose-500/50 transition group">
          <Heart size={20} className="text-rose-400 mb-2" />
          <div className="font-bold text-sm">Mode Rencontres</div>
          <div className="text-[11px] text-zinc-500">Swipe + matches</div>
          <div className="text-[10px] text-rose-300 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">Voir <ExternalLink size={9} /></div>
        </a>
        <a href="/connect/pro" target="_blank" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-sky-500/50 transition group">
          <Briefcase size={20} className="text-sky-400 mb-2" />
          <div className="font-bold text-sm">Mode Pro</div>
          <div className="text-[11px] text-zinc-500">Annuaire pros LGBT</div>
          <div className="text-[10px] text-sky-300 mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100">Voir <ExternalLink size={9} /></div>
        </a>
      </div>

      {/* TOGGLE MOCK */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 my-5">
        <div className="flex items-start gap-3 mb-4">
          <Sparkles size={20} className="text-amber-300 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-bold text-amber-200">Données de démonstration</h3>
            <p className="text-xs text-amber-100/80 mt-1">
              Pour le lancement, le réseau est rempli de <b>9 profils mock</b> + <b>5 posts</b> + <b>5 cartes rencontres</b> + <b>4 pros</b>. Quand tu auras de vrais utilisateurs, désactive cet affichage pour montrer un état vide propre.
            </p>
          </div>
          {saved && <span className="text-emerald-300 text-xs flex items-center gap-1 flex-shrink-0"><CheckCircle2 size={12} /> Sauvé</span>}
        </div>

        <button
          onClick={toggleMock}
          disabled={busy}
          className={`w-full font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition ${
            showMock
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : showMock ? <Trash2 size={16} /> : <Eye size={16} />}
          {showMock ? 'Masquer le contenu mock (état vide pour vrais users)' : 'Réafficher le contenu mock (démo)'}
        </button>

        <p className="text-[10px] text-zinc-500 mt-3 text-center">
          Le mock est codé en dur dans <code>src/lib/connect-mock.ts</code> — c'est un toggle d'affichage, rien n'est supprimé en DB.
        </p>
      </div>

      {/* INFOS PHASE 2 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-sm space-y-3">
        <h3 className="font-bold text-zinc-200">📋 Phase 2 — à brancher quand tu valides le MVP</h3>
        <ul className="text-xs text-zinc-400 space-y-2 list-disc pl-5">
          <li>Schéma Prisma <code className="text-fuchsia-300">ConnectProfile</code>, <code className="text-rose-300">Match</code>, <code className="text-sky-300">Connection</code>, <code className="text-violet-300">Conversation</code></li>
          <li>API <code>/api/connect/profile</code> (CRUD profil par mode + toggle visibilité)</li>
          <li>API <code>/api/connect/swipe</code> (record swipe + détection match croisé)</li>
          <li>Modération auto Gemini sur tous les posts/messages</li>
          <li>Premium 5€/mois (Stripe) : swipes illimités, super-likes, incognito, voir-qui-t-a-liké</li>
          <li>Toggle visibilité par mode dans <code>/mon-espace/profil</code> (apparaître ou pas dans Rencontres / Pro)</li>
          <li>Notifications push croisées (WebPush + Telegram)</li>
        </ul>
      </div>
    </div>
  );
}
