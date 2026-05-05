'use client';
import Link from 'next/link';
import { useState } from 'react';
import {
  Sparkles, Heart, MessageSquare, Image as ImageIcon, Video, Star, Mic, Scale,
  BookOpen, Mail, Camera, ChevronRight, Loader2, Wand2, Trash2, Plane, Phone,
  Award, Activity, Gift, ShoppingBag, Users, MapPin, Calendar, Edit3, Bot
} from 'lucide-react';

const THEMES: Record<string, { gradient: string; ring: string; accent: string }> = {
  fuchsia: { gradient: 'from-fuchsia-500 via-pink-500 to-rose-500',     ring: 'ring-fuchsia-500/40',  accent: 'fuchsia' },
  violet:  { gradient: 'from-violet-500 via-purple-500 to-indigo-600',  ring: 'ring-violet-500/40',   accent: 'violet' },
  cyan:    { gradient: 'from-cyan-400 via-sky-500 to-blue-600',         ring: 'ring-cyan-500/40',     accent: 'cyan' },
  rose:    { gradient: 'from-rose-300 via-pink-400 to-orange-400',      ring: 'ring-rose-500/40',     accent: 'rose' },
  amber:   { gradient: 'from-amber-400 via-orange-500 to-red-500',      ring: 'ring-amber-500/40',    accent: 'amber' },
  emerald: { gradient: 'from-emerald-400 via-teal-500 to-cyan-500',     ring: 'ring-emerald-500/40',  accent: 'emerald' }
};

const MOOD_COLORS: Record<string, string> = {
  '😊 joyeux': '#fbbf24', '😢 triste': '#60a5fa', '😰 anxieux': '#a78bfa', '🥹 fier': '#f472b6',
  '✨ espoir': '#34d399', '😡 colère': '#ef4444', '😌 paisible': '#67e8f9', '🌧 mélancolique': '#94a3b8'
};

export function MonEspaceDashboard({ user, stats, flags, moodCounts, activityDays }: any) {
  const [u, setU] = useState(user);
  const [busy, setBusy] = useState(false);
  const themeKey = u?.dashboardTheme || 'fuchsia';
  const theme = THEMES[themeKey] || THEMES.fuchsia;

  async function generateBanner() {
    setBusy(true);
    try {
      const r = await fetch('/api/me/banner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (j.bannerUrl) setU({ ...u, bannerUrl: j.bannerUrl });
      else alert(j.error || 'Erreur génération');
    } finally { setBusy(false); }
  }

  async function deleteBanner() {
    if (!confirm('Supprimer ta bannière ?')) return;
    await fetch('/api/me/banner', { method: 'DELETE' });
    setU({ ...u, bannerUrl: null });
  }

  async function changeTheme(key: string) {
    setU({ ...u, dashboardTheme: key });
    await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dashboardTheme: key }) });
  }

  const totalContrib = stats.posts + stats.threads + stats.photos + stats.testimonies + stats.reviews + stats.journal;
  const totalMood = Object.values(moodCounts as Record<string, number>).reduce((a, b) => a + b, 0);
  const memberDays = u?.createdAt ? Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 86400000) : 0;

  // Modules actifs (filtrés par feature flags)
  const QUICK_ACTIONS = [
    { flag: 'shareCards',   href: '/partager',         icon: Sparkles,  label: 'Crée ta carte',     color: 'from-fuchsia-500 to-pink-500' },
    { flag: 'voiceCoach',   href: '/voice-coach',      icon: Mic,       label: 'Voice Coach',       color: 'from-violet-500 to-purple-600' },
    { flag: 'inclusiveVerse', href: '/verset-inclusif', icon: BookOpen,  label: 'Verset inclusif',   color: 'from-amber-500 to-orange-500' },
    { flag: 'legalAI',      href: '/aide-juridique',   icon: Scale,     label: 'Aide juridique',    color: 'from-emerald-500 to-teal-500' },
    { flag: 'travelSafe',   href: '/voyage-safe',      icon: Plane,     label: 'Voyage safe',       color: 'from-cyan-500 to-blue-600' },
    { flag: 'forum',        href: '/forum',            icon: MessageSquare, label: 'Forum',         color: 'from-rose-500 to-pink-600' }
  ].filter(a => flags[a.flag] !== false);

  return (
    <div className="space-y-5">
      {/* HERO BANNER personnalisé */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800" style={{ height: 240 }}>
        {u?.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Avatar + identité */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
          <div className="flex items-end gap-4">
            {u?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.image} alt="" className={`w-24 h-24 rounded-full border-4 border-white/40 shadow-2xl ring-4 ${theme.ring}`} />
            ) : (
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-bold text-4xl border-4 border-white/40 shadow-2xl ring-4 ${theme.ring}`}>
                {(u?.publicName || u?.name || u?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-3xl font-bold text-white drop-shadow">{u?.publicName || u?.name || u?.email?.split('@')[0]}</h1>
              {u?.identity && <p className="text-sm text-white/90 drop-shadow">✨ {u.identity}</p>}
              {u?.cityProfile && <p className="text-xs text-white/70 drop-shadow">📍 {u.cityProfile}</p>}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={generateBanner} disabled={busy} className="bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold px-3 py-2 rounded-full inline-flex items-center gap-1.5 border border-white/30">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
              {busy ? 'IA…' : 'Bannière IA'}
            </button>
            {u?.bannerUrl && <button onClick={deleteBanner} className="bg-black/40 hover:bg-black/60 backdrop-blur text-white p-2 rounded-full" title="Supprimer"><Trash2 size={12} /></button>}
            <Link href="/mon-espace/profil" className="bg-white/20 hover:bg-white/30 backdrop-blur text-white p-2 rounded-full" title="Modifier profil"><Edit3 size={12} /></Link>
          </div>
        </div>
      </section>

      {/* Sélecteur de thème */}
      <section className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] uppercase font-bold text-zinc-400">Couleur du thème :</span>
        {Object.entries(THEMES).map(([k, t]) => (
          <button key={k} onClick={() => changeTheme(k)} className={`w-8 h-8 rounded-full bg-gradient-to-br ${t.gradient} ${themeKey === k ? 'ring-2 ring-offset-2 ring-offset-black ring-white scale-110' : ''} transition-transform`} title={k} />
        ))}
      </section>

      {/* KPI cards avec gradients */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={MessageSquare} value={stats.posts}        label="Posts forum"     gradient="from-fuchsia-500 to-pink-600" />
        <KPI icon={Video}         value={stats.testimonies}  label="Témoignages"     gradient="from-rose-500 to-red-600" />
        <KPI icon={ImageIcon}     value={stats.photos}       label="Photos"          gradient="from-violet-500 to-purple-600" />
        <KPI icon={Heart}         value={totalContrib}       label="Total impact"    gradient="from-amber-500 to-orange-600" />
      </section>

      {/* Quick actions cards (gros) */}
      <section>
        <h2 className="text-xs uppercase font-bold text-zinc-400 mb-3 flex items-center gap-2"><Sparkles size={12} /> Outils du moment</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(a => (
            <Link key={a.href} href={a.href} className="group relative overflow-hidden rounded-2xl border border-zinc-800 hover:border-zinc-700 transition" style={{ height: 110 }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${a.color} opacity-90 group-hover:opacity-100 transition`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <a.icon size={28} className="text-white drop-shadow" />
                <div className="flex items-end justify-between">
                  <div className="font-bold text-white text-sm drop-shadow">{a.label}</div>
                  <ChevronRight size={16} className="text-white/80 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Layout 3 colonnes : journal + activité + mood ring */}
      <section className="grid lg:grid-cols-3 gap-3">
        {/* Journal mini */}
        <Link href="/mon-espace/journal" className="bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 rounded-2xl p-4 transition group">
          <BookOpen size={20} className="text-violet-400 mb-2" />
          <div className="font-bold text-sm">📔 Journal intime</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">{stats.journal} entrée(s) · 100% privé</div>
          <div className="text-[11px] text-violet-300 mt-3 group-hover:translate-x-1 transition flex items-center gap-1">Écrire <ChevronRight size={11} /></div>
        </Link>

        {/* Lettres futures */}
        <Link href="/mon-espace/lettres" className="bg-zinc-900 border border-zinc-800 hover:border-pink-500/40 rounded-2xl p-4 transition group">
          <Mail size={20} className="text-pink-400 mb-2" />
          <div className="font-bold text-sm">💌 Lettres au futur</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">{stats.letters} lettre(s) programmée(s)</div>
          <div className="text-[11px] text-pink-300 mt-3 group-hover:translate-x-1 transition flex items-center gap-1">Programmer <ChevronRight size={11} /></div>
        </Link>

        {/* Mood ring */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <Activity size={20} className="text-cyan-400 mb-2" />
          <div className="font-bold text-sm">🎭 Mes humeurs récentes</div>
          {totalMood === 0 ? (
            <div className="text-[10px] text-zinc-400 mt-2">Pas encore d'entrées de journal avec humeur.</div>
          ) : (
            <div className="mt-3">
              <div className="flex h-3 rounded-full overflow-hidden">
                {Object.entries(moodCounts).map(([m, count]) => {
                  const c = (count as number) / totalMood * 100;
                  return <div key={m} style={{ width: `${c}%`, background: MOOD_COLORS[m] || '#888' }} title={`${m} ${count}x`} />;
                })}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(moodCounts).slice(0, 5).map(([m, c]) => (
                  <span key={m} className="text-[10px] text-zinc-300 bg-zinc-950 px-2 py-0.5 rounded-full">{m} {String(c)}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Heatmap d'activité 30 jours */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <h2 className="text-xs uppercase font-bold text-zinc-400 mb-3 flex items-center gap-2"><Activity size={12} /> Mon activité (30 derniers jours)</h2>
        <div className="flex gap-1 items-end h-16">
          {activityDays.map((v: number, i: number) => {
            const max = Math.max(...activityDays, 1);
            const h = Math.max(4, (v / max) * 100);
            return (
              <div key={i}
                className={`flex-1 rounded-t bg-gradient-to-t ${theme.gradient} hover:opacity-100 transition`}
                style={{ height: `${h}%`, opacity: v === 0 ? 0.15 : 0.5 + v / max * 0.5 }}
                title={`Jour J-${29 - i} : ${v} action(s)`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-zinc-400 mt-1">
          <span>il y a 30j</span><span>aujourd'hui</span>
        </div>
      </section>

      {/* Footer info */}
      <section className="bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 border border-fuchsia-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-sm font-bold">🎉 Membre depuis {memberDays} jour(s)</div>
          <div className="text-[11px] text-zinc-400">{u?.bio || 'Ajoute une bio pour personnaliser ton espace'}</div>
        </div>
        <Link href="/wrapped" className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white text-xs font-bold px-4 py-2 rounded-full">✨ Mon Wrapped</Link>
      </section>
    </div>
  );
}

function KPI({ icon: Icon, value, label, gradient }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 group hover:border-zinc-700 transition">
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-30 blur-2xl group-hover:opacity-50 transition`} />
      <div className="relative p-4">
        <Icon size={20} className="text-white mb-2" />
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="text-[10px] text-zinc-400 uppercase">{label}</div>
      </div>
    </div>
  );
}
