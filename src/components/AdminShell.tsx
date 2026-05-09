'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import type { MenuPermissions, UserOverride } from '@/lib/menu-permissions';
import { Menu as MenuIcon, X, Heart } from 'lucide-react';
import { MegaSearch } from './MegaSearch';
import { AdminPageBanner } from './admin/AdminPageBanner';
import { FloatingClaudeButton } from './admin/FloatingClaudeButton';

/**
 * AdminShell — coquille du back-office.
 *
 * Fixes mobile/tablette appliqués :
 *  - `min-h-screen` + `min-h-[100dvh]` pour iOS Safari (dynamic viewport)
 *  - Sidebar utilise `left-[-100%]` (plus sûr que -translate-x-full sur iPad OS < 17)
 *  - Position relative parent + z-index explicite pour éviter stacking context bugs
 *  - Défensif : safe-area inset top pour notch iPhone/iPad
 *  - Error boundary : si le children crash, affiche fallback au lieu de page noire
 */
export function AdminShell({
  children,
  role = 'EDITOR',
  perms = { hidden: [], editorHidden: [] },
  userOverride = null
}: {
  children: React.ReactNode;
  role?: string;
  perms?: MenuPermissions;
  userOverride?: UserOverride | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const showSidebar = !pathname?.startsWith('/admin/login');

  // Marque hydraté côté client pour éviter mismatch SSR vs CSR
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileOpen]);

  if (!showSidebar) {
    return <div className="min-h-screen min-h-[100dvh]">{children}</div>;
  }

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] bg-zinc-950">
      {/* Sidebar : visible permanente sur ≥lg, drawer off-canvas sur mobile/tablette */}
      <div
        aria-hidden={!mobileOpen ? 'true' : 'false'}
        className={`
          fixed top-0 bottom-0 z-50 transition-[left,opacity] duration-200 ease-out
          lg:static lg:z-auto lg:left-0 lg:opacity-100
          ${mobileOpen
            ? 'left-0 opacity-100'
            : 'left-[-110%] opacity-0 lg:left-0 lg:opacity-100'
          }
        `}
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        <AdminSidebar role={role} perms={perms} userOverride={userOverride} />
      </div>

      {/* Backdrop mobile (fade-in/out pour iOS smoothness) */}
      <button
        aria-label="Fermer le menu"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Contenu principal */}
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        {/* Topbar — backdrop-blur seulement si supporté (iPadOS pre-17 fallback) */}
        <header
          className="sticky top-0 z-30 supports-[backdrop-filter]:bg-zinc-950/85 supports-[backdrop-filter]:backdrop-blur bg-zinc-950 border-b border-zinc-800 flex items-center gap-3 px-4 py-3"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0), 0.75rem)' }}
        >
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

        {/* Wrap children dans une zone explicite pour éviter le black screen */}
        <main className="flex-1 min-w-0 bg-zinc-950 text-white">
          {/* Banner thématique animé — auto-résolu depuis le pathname */}
          <div className="px-3 lg:px-4 pt-3 lg:pt-4">
            <AdminPageBanner />
          </div>
          {children}
        </main>

        {/* Bouton flottant Claude AI — accessible partout */}
        <FloatingClaudeButton />

        {/* Diagnostic : si pas hydraté après 5s, indique un problème */}
        {!hydrated && <NoJsFallback />}
      </div>
    </div>
  );
}

function NoJsFallback() {
  return (
    <noscript>
      <div className="p-6 m-6 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <h2 className="font-bold mb-2">⚠️ JavaScript désactivé</h2>
        <p className="text-sm">Le back-office GLD nécessite JavaScript. Active-le ou utilise un navigateur récent (Safari 17+, Chrome 120+).</p>
      </div>
    </noscript>
  );
}
