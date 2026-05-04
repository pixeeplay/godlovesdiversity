'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShieldCheck, FileText, Mail, Calendar,
  Sparkles, Users, Settings, LogOut, Heart, UploadCloud, MapPin, Home,
  Image as ImageIcon, Video, Layers, GalleryHorizontalEnd, Menu as MenuIcon,
  Youtube, HandHeart, Handshake, ShoppingBag, ChevronDown, ChevronRight,
  Package, Truck, ShieldAlert, type LucideIcon
} from 'lucide-react';
import type { MenuPermissions } from '@/lib/menu-permissions';
import { isItemVisible } from '@/lib/menu-permissions';

type Item = { href: string; label: string; icon: LucideIcon; badge?: string };
type Group = { id: string; label: string; icon: LucideIcon; children: Item[] };
type Entry = Item | Group;

function isGroup(e: Entry): e is Group {
  return (e as Group).children !== undefined;
}

const NAV: Entry[] = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
  {
    id: 'shop',
    label: 'Boutique',
    icon: ShoppingBag,
    children: [
      { href: '/admin/shop', label: 'Produits', icon: Package },
      { href: '/admin/shop/orders', label: 'Commandes', icon: ShoppingBag },
      { href: '/admin/shop/dropshipping', label: 'Dropshipping', icon: Truck }
    ]
  },
  {
    id: 'content',
    label: 'Contenu',
    icon: ImageIcon,
    children: [
      { href: '/admin/moderation', label: 'Modération', icon: ShieldCheck },
      { href: '/admin/import', label: 'Import en masse', icon: UploadCloud },
      { href: '/admin/map', label: 'Carte mondiale', icon: MapPin },
      { href: '/admin/posters', label: 'Affiches', icon: ImageIcon },
      { href: '/admin/news', label: 'Actualités', icon: Video },
      { href: '/admin/events', label: 'Événements (agenda)', icon: Calendar },
      { href: '/admin/videos', label: 'Vidéos YouTube', icon: Youtube },
      { href: '/admin/banners', label: 'Bannières (hero)', icon: GalleryHorizontalEnd }
    ]
  },
  {
    id: 'comm',
    label: 'Communication',
    icon: Mail,
    children: [
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
      { href: '/admin/calendar', label: 'Calendrier social', icon: Calendar },
      { href: '/admin/pages', label: 'Pages riches', icon: Layers },
      { href: '/admin/content', label: 'Pages & blog', icon: FileText },
      { href: '/admin/partners', label: 'Partenaires', icon: Handshake },
      { href: '/admin/donate', label: 'Dons & ticker', icon: HandHeart }
    ]
  },
  {
    id: 'ai',
    label: 'IA & Outils',
    icon: Sparkles,
    children: [
      { href: '/admin/ai', label: 'Studio IA', icon: Sparkles },
      { href: '/admin/ai/knowledge', label: 'Cerveau de GLD (RAG)', icon: Sparkles },
      { href: '/admin/ai/avatar', label: 'GLD Live (avatar vidéo)', icon: Video },
      { href: '/admin/i18n', label: 'Traductions IA (FR/EN/ES/PT)', icon: Sparkles },
      { href: '/admin/integrations/telegram', label: 'Bot Telegram (notifs + commandes)', icon: MenuIcon },
      { href: '/admin/integrations', label: 'Intégrations', icon: Layers },
      { href: '/admin/setup', label: 'Assistant configuration', icon: Sparkles }
    ]
  },
  {
    id: 'system',
    label: 'Système',
    icon: Settings,
    children: [
      { href: '/admin/menu', label: 'Menu nav', icon: MenuIcon },
      { href: '/admin/home', label: 'Page d\'accueil', icon: Home },
      { href: '/admin/menu-permissions', label: 'Visibilité menu (admin)', icon: ShieldAlert },
      { href: '/admin/users', label: 'Utilisateurs', icon: Users },
      { href: '/admin/settings', label: 'Paramètres', icon: Settings }
    ]
  }
];

const STORAGE_KEY = 'gld-admin-sidebar-open';

export function AdminSidebar({
  role = 'EDITOR',
  perms = { hidden: [], editorHidden: [] }
}: {
  role?: string;
  perms?: MenuPermissions;
} = {}) {
  const path = usePathname();
  const { data } = useSession();
  const isAdmin = role === 'ADMIN';

  // Filtre la nav : retire les items cachés (sauf l'item de gestion lui-même pour l'ADMIN)
  const filteredNav: Entry[] = NAV.map((entry) => {
    if (!isGroup(entry)) {
      return isItemVisible(entry.href, role, perms) ? entry : null;
    }
    const visibleChildren = entry.children.filter((c) => {
      // L'item "menu-permissions" reste toujours visible pour l'ADMIN
      if (c.href === '/admin/menu-permissions') return isAdmin;
      return isItemVisible(c.href, role, perms);
    });
    return visibleChildren.length === 0 ? null : { ...entry, children: visibleChildren };
  }).filter((x): x is Entry => x !== null);

  // Détecte le groupe actif à partir du chemin
  const findActiveGroupId = (): string | null => {
    for (const e of filteredNav) {
      if (isGroup(e) && e.children.some((c) => path === c.href || path.startsWith(c.href + '/'))) {
        return e.id;
      }
    }
    return null;
  };

  const [open, setOpen] = useState<Set<string>>(new Set());

  // Au montage, restaure depuis localStorage et ouvre le groupe actif
  useEffect(() => {
    let initial: Set<string>;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      initial = saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      initial = new Set();
    }
    const active = findActiveGroupId();
    if (active) initial.add(active);
    setOpen(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  return (
    <aside className="w-72 sm:w-64 h-screen lg:h-auto shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
        <Heart className="text-brand-pink" />
        <span className="font-display font-bold">GLD Admin</span>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((entry) => {
          // Item simple (Tableau de bord)
          if (!isGroup(entry)) {
            const Icon = entry.icon;
            const active = path === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${active ? 'bg-brand-pink/15 text-brand-pink font-semibold' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <Icon size={18} />
                {entry.label}
              </Link>
            );
          }

          // Groupe avec sous-menu
          const Icon = entry.icon;
          const isOpen = open.has(entry.id);
          const hasActiveChild = entry.children.some(
            (c) => path === c.href || path.startsWith(c.href + '/')
          );

          return (
            <div key={entry.id}>
              <button
                type="button"
                onClick={() => toggle(entry.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                  ${hasActiveChild
                    ? 'bg-zinc-800/60 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'}`}
              >
                <Icon size={18} className={hasActiveChild ? 'text-brand-pink' : ''} />
                <span className="flex-1 text-left">{entry.label}</span>
                {hasActiveChild && !isOpen && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-pink" />
                )}
                {isOpen
                  ? <ChevronDown size={14} className="opacity-60" />
                  : <ChevronRight size={14} className="opacity-60" />}
              </button>

              {isOpen && (
                <div className="mt-1 ml-3 pl-3 border-l border-zinc-800 space-y-0.5">
                  {entry.children.map((c) => {
                    const ChildIcon = c.icon;
                    const childActive = path === c.href || path.startsWith(c.href + '/');
                    return (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] transition
                          ${childActive
                            ? 'bg-brand-pink/15 text-brand-pink font-semibold'
                            : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}`}
                      >
                        <ChildIcon size={14} />
                        {c.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
