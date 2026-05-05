'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, User, Shield, Bell, Eye, FileText, MessageSquare, Video,
  Image as ImageIcon, MessageCircle, Edit3, Heart, ThumbsUp, Users,
  Activity, Plane, Phone, Calendar, BookOpen, ShoppingBag, Star, MapPin,
  Flag, Home as HomeIcon, Gift, Award, Sparkles, Bot, Edit, Mail,
  Lock, LogOut
} from 'lucide-react';

const SECTIONS: Array<{ label: string; items: Array<{ href: string; icon: any; label: string }> }> = [
  {
    label: 'Aperçu',
    items: [
      { href: '/mon-espace',          icon: Home,       label: 'Tableau de bord' }
    ]
  },
  {
    label: 'Profil',
    items: [
      { href: '/mon-espace/profil',          icon: User,    label: 'Mon profil' },
      { href: '/mon-espace/securite',        icon: Shield,  label: 'Sécurité' },
      { href: '/mon-espace/notifications',   icon: Bell,    label: 'Notifications' },
      { href: '/mon-espace/confidentialite', icon: Eye,     label: 'Confidentialité' },
      { href: '/mon-espace/rgpd',            icon: Lock,    label: 'Mes données (RGPD)' }
    ]
  },
  {
    label: 'Mes contenus',
    items: [
      { href: '/mon-espace/posts',         icon: MessageSquare, label: 'Mes posts forum' },
      { href: '/mon-espace/temoignages',   icon: Video,         label: 'Mes témoignages' },
      { href: '/mon-espace/photos',        icon: ImageIcon,     label: 'Mes photos' },
      { href: '/mon-espace/commentaires',  icon: MessageCircle, label: 'Mes commentaires' },
      { href: '/mon-espace/brouillons',    icon: Edit3,         label: 'Brouillons' }
    ]
  },
  {
    label: 'Activité',
    items: [
      { href: '/mon-espace/favoris',     icon: Heart,    label: 'Favoris' },
      { href: '/mon-espace/likes',       icon: ThumbsUp, label: 'Mes ❤ donnés' },
      { href: '/mon-espace/abonnements', icon: Users,    label: 'Abonnements' },
      { href: '/mon-espace/activite',    icon: Activity, label: 'Feed perso' }
    ]
  },
  {
    label: 'Sécurité perso',
    items: [
      { href: '/sos/contacts',           icon: Phone,    label: 'Contacts urgence' },
      { href: '/mon-espace/voyage',      icon: Plane,    label: 'Voyage safe' },
      { href: '/mon-espace/hotlines',    icon: Phone,    label: 'Mes hotlines' }
    ]
  },
  {
    label: 'Communauté',
    items: [
      { href: '/mon-espace/rsvp',     icon: Calendar, label: 'Mes meetups' },
      { href: '/mon-espace/cercles',  icon: BookOpen, label: 'Cercles prière' },
      { href: '/mon-espace/mentor',   icon: Users,    label: 'Mentor 1-1' }
    ]
  },
  {
    label: 'Boutique',
    items: [
      { href: '/mon-espace/commandes', icon: ShoppingBag, label: 'Mes commandes' },
      { href: '/mon-espace/wishlist',  icon: Heart,       label: 'Wishlist' },
      { href: '/mon-espace/avis',      icon: Star,        label: 'Mes avis' },
      { href: '/mon-espace/adresses',  icon: MapPin,      label: 'Adresses' }
    ]
  },
  {
    label: 'Contributions',
    items: [
      { href: '/mon-espace/signalements', icon: Flag,    label: 'Mes signalements' },
      { href: '/mon-espace/hebergement',  icon: HomeIcon, label: 'Hébergement' },
      { href: '/mon-espace/parrainage',   icon: Gift,    label: 'Parrainage' }
    ]
  },
  {
    label: 'Reconnaissance',
    items: [
      { href: '/mon-espace/badges',   icon: Award,    label: 'Badges' },
      { href: '/wrapped',             icon: Sparkles, label: 'Wrapped annuel' },
      { href: '/mon-espace/timeline', icon: Activity, label: 'Ma timeline' }
    ]
  },
  {
    label: 'IA perso',
    items: [
      { href: '/mon-espace/ia/historique', icon: Bot,  label: 'Historique IA' },
      { href: '/mon-espace/ia/prompts',    icon: Edit, label: 'Mes prompts' }
    ]
  },
  {
    label: 'Espace privé',
    items: [
      { href: '/mon-espace/journal', icon: BookOpen, label: '📔 Journal intime' },
      { href: '/mon-espace/lettres', icon: Mail,     label: '💌 Lettres futures' }
    ]
  }
];

export function MonEspaceSidebar() {
  const path = usePathname();
  return (
    <nav className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-sm">
      <div className="text-[10px] uppercase tracking-widest text-fuchsia-400 font-bold px-2 py-1 mb-2">Mon espace</div>
      {SECTIONS.map(sec => (
        <div key={sec.label} className="mb-3">
          <div className="text-[10px] uppercase text-zinc-400 font-bold px-2 mb-1">{sec.label}</div>
          <ul className="space-y-0.5">
            {sec.items.map(it => {
              const active = path === it.href || (it.href !== '/mon-espace' && path?.startsWith(it.href));
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition ${active ? 'bg-fuchsia-500/15 text-fuchsia-200 font-bold' : 'text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    <Icon size={13} className={active ? 'text-fuchsia-400' : 'text-zinc-400'} />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="border-t border-zinc-800 pt-2 mt-2">
        <a href="/api/auth/signout" className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-red-400 hover:bg-red-500/5">
          <LogOut size={13} /> Déconnexion
        </a>
      </div>
    </nav>
  );
}
