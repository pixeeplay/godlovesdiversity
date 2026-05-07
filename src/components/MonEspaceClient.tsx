'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Heart, MessageSquare, Image as ImageIcon, Video, Star, LogOut, User,
  Sparkles, Phone, Plane, Gift, Award, ShieldAlert, Calendar, BookOpen,
  Mic, Scale, Share2, MapPin, Home as HomeIcon, Coins, ShoppingBag, Users
} from 'lucide-react';

type Props = {
  user: any;
  stats: { posts: number; threads: number; photos: number; testimonies: number; reviews: number };
  flags: Record<string, boolean>;
};

export function MonEspaceClient({ user, stats, flags }: Props) {
  const totalContrib = stats.posts + stats.threads + stats.photos + stats.testimonies + stats.reviews;

  // Modules conditionnés par feature flags
  const SHORTCUTS = [
    { flag: 'emergencyContacts', href: '/sos/contacts',     icon: ShieldAlert, label: 'Contacts urgence', color: 'red' },
    { flag: 'travelSafe',        href: '/voyage-safe',      icon: Plane,       label: 'Voyage safe',     color: 'cyan' },
    { flag: 'shareCards',        href: '/partager',         icon: Share2,      label: 'Crée ta carte',   color: 'fuchsia' },
    { flag: 'referral',          href: '/parrainage',       icon: Gift,        label: 'Parrainage',      color: 'pink' },
    { flag: 'wrapped',           href: '/wrapped',          icon: Sparkles,    label: 'Mon Wrapped',     color: 'amber' },
    { flag: 'voiceCoach',        href: '/voice-coach',      icon: Mic,         label: 'Voice Coach',     color: 'violet' },
    { flag: 'legalAI',           href: '/aide-juridique',   icon: Scale,       label: 'Aide juridique',  color: 'amber' },
    { flag: 'inclusiveVerse',    href: '/verset-inclusif',  icon: BookOpen,    label: 'Verset inclusif', color: 'violet' },
    { flag: 'forum',             href: '/forum',            icon: MessageSquare,label: 'Forum',          color: 'fuchsia' },
    { flag: 'testimonies',       href: '/temoignages',      icon: Video,       label: 'Témoignages',     color: 'pink' },
    { flag: 'gldLocal',          href: '/gld-local',        icon: MapPin,      label: 'GLD Local',       color: 'cyan' },
    { flag: 'mentor',            href: '/mentor',           icon: Users,       label: 'Mentor 1-1',      color: 'violet' },
    { flag: 'meetups',           href: '/meetups',          icon: Calendar,    label: 'Meetups',         color: 'amber' },
    { flag: 'signalement',       href: '/signalement',      icon: ShieldAlert, label: 'Signaler',        color: 'red' },
    { flag: 'hebergement',       href: '/hebergement',      icon: HomeIcon,    label: 'Hébergement',     color: 'emerald' },
    { flag: 'membrePlus',        href: '/membre-plus',      icon: Star,        label: 'Membre+',         color: 'amber' },
    { flag: 'marketplace',       href: '/marketplace',      icon: ShoppingBag, label: 'Marketplace',     color: 'pink' },
    { flag: 'crowdfunding',      href: '/crowdfunding',     icon: Coins,       label: 'Crowdfunding',    color: 'amber' }
  ].filter(s => flags[s.flag]);

  // Badges débloqués
  const badges = [
    { name: '🌱 Témoin',          earned: stats.posts + stats.threads + stats.testimonies >= 1, desc: '1er post / témoignage' },
    { name: '💗 Soutien',         earned: false /* TODO: count peer help supports */, desc: '10 cœurs donnés' },
    { name: '👼 Ange gardien',    earned: false, desc: '5 réponses peer-help' },
    { name: '📣 Ambassadeur·rice', earned: false, desc: '3 ami·es parrainés' },
    { name: '✨ Veilleur·se',     earned: user?.createdAt ? (Date.now() - new Date(user.createdAt).getTime()) > 365 * 86400000 : false, desc: '1 an d\'activité' }
  ];
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <main className="container-wide py-8 max-w-6xl">
      <header className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="w-14 h-14 rounded-full" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold leading-none">Bienvenue, {user?.name || user?.email?.split('@')[0]}</h1>
            <p className="text-zinc-400 text-xs mt-1">Ton espace personnel GLD · membre depuis {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '?'}</p>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1">
          <LogOut size={12} /> Déconnexion
        </button>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
        <KPI icon={MessageSquare} value={stats.posts}        label="Posts forum"   color="fuchsia" />
        <KPI icon={Heart}         value={stats.threads}      label="Sujets"        color="pink" />
        <KPI icon={ImageIcon}     value={stats.photos}       label="Photos"        color="violet" />
        <KPI icon={Video}         value={stats.testimonies}  label="Témoignages"   color="rose" />
        <KPI icon={Star}          value={stats.reviews}      label="Avis"          color="amber" />
      </section>

      {/* Badges */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <h2 className="text-xs uppercase font-bold text-fuchsia-400 mb-3 flex items-center gap-2">
          <Award size={12} /> Mes badges ({earnedCount}/{badges.length})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {badges.map(b => (
            <div key={b.name} className={`p-3 rounded-xl text-center ${b.earned ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-zinc-950 border border-zinc-800 opacity-50'}`}>
              <div className="text-2xl mb-1">{b.name.split(' ')[0]}</div>
              <div className="text-[10px] font-bold">{b.name.split(' ').slice(1).join(' ')}</div>
              <div className="text-[9px] text-zinc-400 mt-1">{b.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mes contenus */}
      <section className="mb-6">
        <h2 className="text-xs uppercase font-bold text-fuchsia-400 mb-3">Mes contenus</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          {flags.forum && <Link href={`/profil/${user?.id}/posts`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3"><MessageSquare size={16} className="text-fuchsia-400 mb-2" /><div className="font-bold text-sm">Mes posts forum</div><div className="text-[10px] text-zinc-400">{stats.posts} message(s)</div></Link>}
          {flags.testimonies && <Link href="/temoignages" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3"><Video size={16} className="text-pink-400 mb-2" /><div className="font-bold text-sm">Mes témoignages</div><div className="text-[10px] text-zinc-400">{stats.testimonies} vidéo(s)</div></Link>}
          <Link href="/participer" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3"><ImageIcon size={16} className="text-violet-400 mb-2" /><div className="font-bold text-sm">Mes photos</div><div className="text-[10px] text-zinc-400">{stats.photos} envoyée(s)</div></Link>
        </div>
      </section>

      {/* Tous les outils */}
      <section>
        <h2 className="text-xs uppercase font-bold text-fuchsia-400 mb-3 flex items-center gap-2">
          <Sparkles size={12} /> Tous les outils ({SHORTCUTS.length})
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {SHORTCUTS.map(s => (
            <Link key={s.href} href={s.href} className={`bg-${s.color}-500/5 hover:bg-${s.color}-500/10 border border-${s.color}-500/30 rounded-xl p-3 text-center transition`}>
              <s.icon size={20} className={`text-${s.color}-400 mx-auto mb-1.5`} />
              <div className="text-[11px] font-bold">{s.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 text-center">
        💡 Total contribution : <strong className="text-fuchsia-400">{totalContrib}</strong> action(s). Tu fais bouger le mouvement.
      </div>
    </main>
  );
}

function KPI({ icon: Icon, value, label, color }: any) {
  return (
    <div className={`bg-${color}-500/5 border border-${color}-500/30 rounded-xl p-3 text-center`}>
      <Icon size={16} className={`text-${color}-400 mx-auto mb-1`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[9px] text-zinc-400 uppercase">{label}</div>
    </div>
  );
}
