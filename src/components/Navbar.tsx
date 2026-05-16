'use client';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, LogIn, LogOut, LayoutDashboard, User } from 'lucide-react';
import { NeonHeart } from './NeonHeart';
import { ThemeToggle } from './ThemeToggle';
import { CartBadge } from './CartBadge';
import { DynamicIslandSearch } from './DynamicIslandSearch';
import { useSession, signOut } from 'next-auth/react';

const LOCALES = ['fr', 'en', 'es', 'pt'] as const;

/**
 * GLD V1 — Navbar haut de gamme, anti "arbre de Noël"
 * Desktop : Le Message | La Communauté | La Galerie | Qui sommes-nous ? | [Nous soutenir] | Contact
 * "Nous soutenir" = CTA principal (bouton plein, glow hover discret)
 * Autres liens : texte discret + underline subtle au hover
 * Mobile : burger top-right, drawer full-screen, items ≥ 44px touch
 */
export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === 'ADMIN' || role === 'EDITOR';
  const isLogged = status === 'authenticated';

  useEffect(() => {
    fetch('/api/branding').then((r) => r.json()).then((j) => setLogoUrl(j.logoUrl || '')).catch(() => {});
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [locale]);

  // Bloque le scroll du body quand le drawer mobile est ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const localePrefix = locale !== 'fr' ? `/${locale}` : '';

  // GLD V1 — Menu exact défini par le brief client
  const navItems = [
    { href: '/le-message',      label: t('leMessage') },
    { href: '/la-communaute',   label: t('laCommunaute') },
    { href: '/galerie',         label: t('laGalerie') },
    { href: '/qui-sommes-nous', label: t('quiSommesNous') }
  ];

  const supportHref = `${localePrefix}/don`;
  const contactHref = `${localePrefix}/contact`;

  return (
    <header className={`transition-all duration-300 backdrop-blur-xl bg-[color:var(--bg)]/95 border-b border-[color:var(--border)] ${scrolled ? 'py-2' : 'py-3'}`}>
      <div className="container-wide flex items-center justify-between gap-6">
        {/* Logo */}
        <a href={`${localePrefix}/`} className="flex flex-row items-center gap-3 shrink-0">
          <span className="block w-10 h-10 flex-none">
            <NeonHeart size={40} />
          </span>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-9 max-w-[160px] w-auto object-contain flex-none" />
          ) : (
            <span className="font-display font-black leading-none text-[color:var(--accent)] hidden sm:flex flex-col flex-none">
              <span className="text-sm">GOD</span>
              <span className="text-sm">LOVES</span>
              <span className="text-sm">DIVERSITY</span>
            </span>
          )}
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7 flex-1 justify-center">
          {navItems.map((m) => {
            const fullHref = `${localePrefix}${m.href}`;
            const isActive = pathname === m.href;
            return (
              <a
                key={m.href}
                href={fullHref}
                className={`gld-nav-link ${isActive ? 'active' : ''}`}
              >
                {m.label}
              </a>
            );
          })}
          {/* CTA principal du header */}
          <a href={supportHref} className="gld-header-cta">
            {t('nousSoutenir')}
          </a>
          {/* Contact en dernier, discret */}
          <a
            href={contactHref}
            className={`gld-nav-link ${pathname === '/contact' ? 'active' : ''}`}
          >
            {t('contact')}
          </a>
        </nav>

        {/* Right cluster — desktop */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="hidden xl:block w-44">
            <DynamicIslandSearch scope="public" />
          </div>
          <CartBadge />
          <ThemeToggle />
          <select
            value={locale}
            onChange={(e) => {
              const newLocale = e.target.value;
              window.location.href = `/${newLocale}${pathname === '/' ? '' : pathname}`;
            }}
            className="bg-transparent border border-[color:var(--border)] rounded-full px-2.5 py-1 text-xs"
            style={{ color: 'var(--fg)' }}
            aria-label="Langue"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l} style={{ background: 'var(--bg)', color: 'var(--fg)' }}>{l.toUpperCase()}</option>
            ))}
          </select>
          {!isLogged ? (
            <a
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[color:var(--border)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] transition"
              style={{ color: 'var(--fg)' }}
              title="Se connecter"
            >
              <LogIn size={13} />
            </a>
          ) : (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full border border-[color:var(--border)] hover:border-[color:var(--accent)] transition"
                style={{ color: 'var(--fg)' }}
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white grid place-items-center text-[10px] font-bold">
                  {(session?.user?.name || session?.user?.email || '?').charAt(0).toUpperCase()}
                </span>
                <ChevronDown size={11} className={`transition ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 mt-2 min-w-[220px] py-2 bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl shadow-2xl z-[60]">
                  <div className="px-4 py-2 border-b border-[color:var(--border)] mb-1">
                    <div className="text-sm font-bold truncate" style={{ color: 'var(--fg)' }}>{session?.user?.name || 'Membre'}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--fg-muted)' }}>{session?.user?.email}</div>
                    {isAdmin && (
                      <div className="text-[10px] mt-1 inline-block bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">{role}</div>
                    )}
                  </div>
                  <a
                    href="/mon-espace"
                    onClick={() => setUserMenuOpen(false)}
                    className="px-4 py-2 text-sm hover:bg-white/5 hover:text-brand-pink transition flex items-center gap-2"
                    style={{ color: 'var(--fg)' }}
                  >
                    <User size={14} /> Mon espace
                  </a>
                  {isAdmin && (
                    <a
                      href="/admin"
                      onClick={() => setUserMenuOpen(false)}
                      className="px-4 py-2 text-sm hover:bg-white/5 hover:text-brand-pink transition flex items-center gap-2"
                      style={{ color: 'var(--fg)' }}
                    >
                      <LayoutDashboard size={14} /> Back-office admin
                    </a>
                  )}
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 hover:text-red-400 transition flex items-center gap-2 border-t border-[color:var(--border)] mt-1 pt-2"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    <LogOut size={14} /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile — burger top-right + CTA visible */}
        <div className="lg:hidden flex items-center gap-2">
          <CartBadge />
          <a
            href={supportHref}
            className="gld-header-cta !text-[11px] !px-3 !py-1.5"
          >
            {t('nousSoutenir')}
          </a>
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="w-11 h-11 grid place-items-center rounded-full border border-[color:var(--border)] hover:border-[color:var(--accent)] transition"
            style={{ color: 'var(--fg)' }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — full-screen */}
      <div
        className={`lg:hidden fixed inset-0 z-[55] transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />
      <nav
        className={`lg:hidden fixed top-0 right-0 bottom-0 w-full sm:w-[420px] max-w-full z-[60] transform transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--border)]">
          <span className="font-display font-black text-base tracking-wider" style={{ color: 'var(--accent)' }}>MENU</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer"
            className="w-11 h-11 grid place-items-center rounded-full border border-[color:var(--border)]"
            style={{ color: 'var(--fg)' }}
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6 flex flex-col gap-1 overflow-y-auto" style={{ height: 'calc(100% - 73px)' }}>
          <div className="pb-3 mb-3 border-b border-[color:var(--border)]">
            <DynamicIslandSearch scope="public" fullWidth />
          </div>
          {navItems.map((m) => {
            const fullHref = `${localePrefix}${m.href}`;
            const isActive = pathname === m.href;
            return (
              <a
                key={m.href}
                href={fullHref}
                onClick={() => setOpen(false)}
                className={`min-h-[52px] flex items-center text-lg font-medium px-2 border-b border-[color:var(--border)]/40 ${isActive ? 'text-[color:var(--accent)]' : ''}`}
                style={{ color: isActive ? undefined : 'var(--fg)' }}
              >
                {m.label}
              </a>
            );
          })}
          <a
            href={contactHref}
            onClick={() => setOpen(false)}
            className="min-h-[52px] flex items-center text-lg font-medium px-2 border-b border-[color:var(--border)]/40"
            style={{ color: 'var(--fg)' }}
          >
            {t('contact')}
          </a>
          <a
            href={supportHref}
            onClick={() => setOpen(false)}
            className="gld-cta-primary mt-6 w-full justify-center"
          >
            {t('nousSoutenir')}
          </a>
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[color:var(--border)]">
            <ThemeToggle />
            <div className="flex items-center gap-1.5">
              {LOCALES.map((l) => (
                <a
                  key={l}
                  href={`/${l}${pathname === '/' ? '' : pathname}`}
                  className={`text-xs px-3 py-2 min-h-[40px] inline-flex items-center rounded-full border ${l === locale ? 'border-[color:var(--accent)] text-[color:var(--accent)]' : 'border-[color:var(--border)] text-[color:var(--fg-muted)]'}`}
                >
                  {l.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          {!isLogged ? (
            <a
              href="/admin/login"
              onClick={() => setOpen(false)}
              className="mt-4 min-h-[48px] flex items-center justify-center gap-2 rounded-full border border-[color:var(--border)] text-sm font-semibold"
              style={{ color: 'var(--fg)' }}
            >
              <LogIn size={14} /> Connexion
            </a>
          ) : (
            <a
              href="/mon-espace"
              onClick={() => setOpen(false)}
              className="mt-4 min-h-[48px] flex items-center justify-center gap-2 rounded-full border border-[color:var(--border)] text-sm font-semibold"
              style={{ color: 'var(--fg)' }}
            >
              <User size={14} /> Mon espace
            </a>
          )}
        </div>
      </nav>
    </header>
  );
}
