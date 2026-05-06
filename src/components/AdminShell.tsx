'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import type { MenuPermissions } from '@/lib/menu-permissions';
import { Menu as MenuIcon, X, Heart } from 'lucide-react';
import { MegaSearch } from './MegaSearch';

export function AdminShell({
  children,
  role = 'EDITOR',
  perms = { hidden: [], editorHidden: [] }
}: {
  children: React.ReactNode;
  role?: string;
  perms?: MenuPermissions;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Pas de sidebar sur la page de login
  const showSidebar = !pathname?.startsWith('/admin/login');

  // Ferme le drawer sur changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Empêche le scroll du body quand drawer ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  if (!showSidebar) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar : visible permanente sur ≥lg, drawer off-canvas sur mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          lg:static lg:translate-x-0 lg:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <AdminSidebar role={role} perms={perms} />
      </div>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <button
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Contenu */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar avec MegaSearch (toujours visible) */}
        <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-800 active:bg-zinc-700"
          >
            <MenuIcon size={22} />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <Heart size={18} className="text-brand-pink" />
            <span className="font-display font-bold">GLD Admin</span>
          </div>
          <div className="flex-1 max-w-2xl mx-auto">
            <MegaSearch scope="admin" placeholder="Rechercher : page, lieu, événement, paramètre… (⌘K)" />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
