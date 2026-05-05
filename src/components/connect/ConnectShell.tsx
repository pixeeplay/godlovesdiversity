'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Users, Heart, Briefcase, Search, Bell, Settings as SettingsIcon } from 'lucide-react';

const TABS = [
  { id: 'mur',         href: '/connect/mur',         label: 'Communauté', icon: Users,     glow: 'from-fuchsia-500 to-violet-600' },
  { id: 'rencontres',  href: '/connect/rencontres',  label: 'Rencontres', icon: Heart,     glow: 'from-rose-500 to-orange-500' },
  { id: 'pro',         href: '/connect/pro',         label: 'Pro',        icon: Briefcase, glow: 'from-sky-500 to-cyan-500' }
] as const;

type TabId = typeof TABS[number]['id'];

export function ConnectShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId: TabId = (TABS.find((t) => pathname?.includes(`/connect/${t.id}`))?.id || 'mur') as TabId;

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Swipe horizontal entre univers (mobile + trackpad)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - (touchStartY.current || 0);
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const idx = TABS.findIndex((t) => t.id === activeId);
        if (dx < 0 && idx < TABS.length - 1) router.push(TABS[idx + 1].href);
        else if (dx > 0 && idx > 0) router.push(TABS[idx - 1].href);
      }
      touchStartX.current = null; touchStartY.current = null;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { el.removeEventListener('touchstart', onTouchStart); el.removeEventListener('touchend', onTouchEnd); };
  }, [activeId, router]);

  // Couleur d'ambiance selon le mode
  const ambient: Record<TabId, { from: string; to: string; via: string }> = {
    mur:        { from: 'rgba(212, 83, 126, 0.18)',  via: 'rgba(124, 58, 237, 0.12)', to: 'rgba(0,0,0,0)' },
    rencontres: { from: 'rgba(244, 63, 94, 0.18)',   via: 'rgba(251, 146, 60, 0.12)', to: 'rgba(0,0,0,0)' },
    pro:        { from: 'rgba(56, 189, 248, 0.18)',  via: 'rgba(99, 102, 241, 0.12)', to: 'rgba(0,0,0,0)' }
  };
  const amb = ambient[activeId];

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950 text-white overflow-hidden relative" style={{
      backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 0%, ${amb.from} 0%, ${amb.via} 35%, ${amb.to} 70%), linear-gradient(180deg, #0a0a0f 0%, #060608 100%)`
    }}>
      {/* Halo dynamique animé en fond */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-60" style={{
        background: `radial-gradient(circle at 20% 10%, ${amb.from} 0%, transparent 40%), radial-gradient(circle at 80% 90%, ${amb.via} 0%, transparent 50%)`
      }} />

      {/* HEADER GLASS — sticky */}
      <header className="sticky top-0 z-50">
        <div className="backdrop-blur-2xl bg-white/[0.04] border-b border-white/[0.06]">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            {/* Logo + nom */}
            <a href="/" className="flex items-center gap-2 shrink-0">
              <span className="w-8 h-8 rounded-full" style={{ background: 'linear-gradient(135deg, #D4537E, #7F77DD)' }} />
              <span className="font-bold text-sm hidden sm:inline">GLD Connect</span>
            </a>

            {/* Recherche glass */}
            <div className="flex-1 max-w-md hidden md:flex items-center gap-2 backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-full px-4 py-1.5">
              <Search size={14} className="text-zinc-400" />
              <input
                placeholder="Rechercher membre, lieu, sujet…"
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-zinc-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full backdrop-blur-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.1]">
                <Bell size={14} />
              </button>
              <a href="/mon-espace" className="p-2 rounded-full backdrop-blur-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.1]">
                <SettingsIcon size={14} />
              </a>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 grid place-items-center text-xs font-bold">A</div>
            </div>
          </div>

          {/* SWITCHER 3 ONGLETS GLASS */}
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <div className="flex items-center gap-1.5 backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-1.5">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = t.id === activeId;
                return (
                  <a
                    key={t.id}
                    href={t.href}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      active
                        ? `bg-gradient-to-r ${t.glow} text-white shadow-lg`
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                    style={active ? { boxShadow: '0 8px 32px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.2)' } : {}}
                  >
                    <Icon size={15} />
                    <span>{t.label}</span>
                  </a>
                );
              })}
            </div>
            <div className="text-center text-[10px] text-zinc-500 mt-2 hidden sm:block">
              ← Glisse latéralement pour naviguer entre les univers →
            </div>
          </div>
        </div>
      </header>

      {/* CONTENU */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
