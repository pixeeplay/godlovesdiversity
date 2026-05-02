'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard, ShieldCheck, FileText, Mail, Calendar,
  Sparkles, Users, Settings, LogOut, Heart, UploadCloud, MapPin, Home, Image as ImageIcon, Video, Layers, GalleryHorizontalEnd, Menu as MenuIcon, Youtube, HandHeart, Handshake, ShoppingBag
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/setup', label: 'Assistant configuration', icon: Sparkles },
  { href: '/admin/banners', label: 'Bannières (hero)', icon: GalleryHorizontalEnd },
  { href: '/admin/menu', label: 'Menu nav', icon: MenuIcon },
  { href: '/admin/home', label: 'Page d\'accueil', icon: Home },
  { href: '/admin/moderation', label: 'Modération', icon: ShieldCheck },
  { href: '/admin/import', label: 'Import en masse', icon: UploadCloud },
  { href: '/admin/map', label: 'Carte mondiale', icon: MapPin },
  { href: '/admin/posters', label: 'Affiches', icon: ImageIcon },
  { href: '/admin/news', label: 'Actualités', icon: Video },
  { href: '/admin/videos', label: 'Vidéos YouTube', icon: Youtube },
  { href: '/admin/donate', label: 'Dons & ticker', icon: HandHeart },
  { href: '/admin/partners', label: 'Partenaires', icon: Handshake },
  { href: '/admin/shop', label: 'Boutique', icon: ShoppingBag },
  { href: '/admin/pages', label: 'Pages riches', icon: Layers },
  { href: '/admin/content', label: 'Pages & blog', icon: FileText },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/admin/calendar', label: 'Calendrier social', icon: Calendar },
  { href: '/admin/ai', label: 'Studio IA', icon: Sparkles },
  { href: '/admin/integrations', label: 'Intégrations', icon: Layers },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings }
];

export function AdminSidebar() {
  const path = usePathname();
  const { data } = useSession();
  return (
    <aside className="w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
        <Heart className="text-brand-pink" />
        <span className="font-display font-bold">GLD Admin</span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                ${active ? 'bg-brand-pink/15 text-brand-pink' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-zinc-800">
        <div className="text-xs text-zinc-500 px-3 mb-2 truncate">{data?.user?.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800"
        >
          <LogOut size={16} /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
