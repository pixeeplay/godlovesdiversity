'use client';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ShoppingCart, MessageCircle, FileText, Image as ImageIcon, ShoppingBag, Sparkles } from 'lucide-react';
import { NeonHeart } from './NeonHeart';
import { ThemeToggle } from './ThemeToggle';
import { CartBadge } from './CartBadge';
import { MegaMenuTrigger } from './MegaMenu';

const LOCALES = ['fr', 'en', 'es', 'pt'] as const;

type MenuItem = {
  id: string;
  label: string;
  href: string;
  external: boolean;
  children: MenuItem[];
};

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/branding').then((r) => r.json()).then((j) => setLogoUrl(j.logoUrl || ''));
    fetch(`/api/menu?locale=${locale}`).then((r) => r.json()).then((j) => {
      setMenu(j.items || []);
    });
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    // Ferme le sous-menu si on clique en dehors
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-submenu-trigger]') && !target.closest('[data-submenu-panel]')) {
        setOpenSub(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onDocClick);
    };
  }, [locale]);

  // Menu complet par défaut — inclut toutes les fonctionnalités V2 (forum, lieux, agenda, témoignages)
  // Les onglets Photos et Boutique sont des mega-menus interactifs séparés (voir <MegaMenuTrigger />)
  const fallback: MenuItem[] = [
    { id: 'm', label: t('message'), href: '/message', external: false, children: [] },
    { id: 'a', label: t('argumentaire'), href: '/argumentaire', external: false, children: [] },
    {
      id: 'community', label: 'Communauté', href: '/forum', external: false, children: [
        { id: 'forum',     label: '💬 Forum',           href: '/forum',                   external: false, children: [] },
        { id: 'temo',      label: '🎥 Témoignages',     href: '/temoignages',             external: false, children: [] },
        { id: 'lieux',     label: '🏳️‍🌈 Lieux LGBT',     href: '/lieux',                   external: false, children: [] },
        { id: 'carte',     label: '🗺 Carte mondiale',   href: '/carte',                   external: false, children: [] },
        { id: 'pro',       label: '🏪 Espace pro',      href: '/admin/pro',               external: false, children: [] },
        { id: 'fbsync',    label: '🔄 Sync mes events FB', href: '/admin/pro/import-events', external: false, children: [] }
      ]
    },
    { id: 'agenda', label: 'Agenda', href: '/agenda', external: false, children: [] },
    { id: 'p', label: t('posters'), href: '/affiches', external: false, children: [] }
  ];
  // On préserve TOUJOURS Communauté + Agenda même si menu DB existe
  const dbHasCommunity = menu.some((m: any) => m.href === '/forum' || m.href === '/lieux' || m.href === '/agenda');
  const items = menu.length > 0
    ? (dbHasCommunity ? menu : [...menu, fallback[2], fallback[3]])
    : fallback;

  return (
    <header className={`transition-all duration-300 backdrop-blur-xl bg-[color:var(--bg)]/95 border-b border-[color:var(--border)] ${scrolled ? 'py-2' : 'py-3'}`}>
      <div className="container-wide flex items-center justify-between">
        <a href="/" className="flex flex-row items-center gap-3 shrink-0">
          {/* Cœur battant rainbow — toujours visible, taille fixe */}
          <span className="block w-12 h-12 flex-none">
            <NeonHeart size={48} />
          </span>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-10 max-w-[180px] w-auto object-contain flex-none" />
          ) : (
            <span className="font-display font-black leading-none text-[color:var(--accent)] hidden sm:flex flex-col flex-none">
              <span className="text-base">GOD</span>
              <span className="text-base">LOVES</span>
              <span className="text-base">DIVERSITY</span>
            </span>
          )}
        </a>

        <nav className="hidden lg:flex items-center gap-6">
          {items.map((m) => {
            const hasChildren = m.children?.length > 0;
            const localePrefix = locale !== 'fr' ? `/${locale}` : '';
            const fullHref = m.external ? m.href : `${localePrefix}${m.href}`;
            // Détection des icônes par label/href
            const Icon = /message/i.test(m.href) ? MessageCircle :
                         /argument/i.test(m.href) ? FileText :
                         /affiche|poster/i.test(m.href) ? ImageIcon : null;
            return (
              <div key={m.id} className="relative">
                {hasChildren ? (
                  <button
                    type="button"
                    data-submenu-trigger
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenSub(openSub === m.id ? null : m.id); }}
                    className={`pill-nav-link inline-flex items-center gap-1.5 ${pathname === m.href ? 'active' : ''}`}
                  >
                    {Icon && <Icon size={14} />}
                    {m.label}
                    <ChevronDown size={12} className={`transition ${openSub === m.id ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <a
                    href={fullHref}
                    target={m.external ? '_blank' : undefined}
                    rel={m.external ? 'noreferrer' : undefined}
                    className={`pill-nav-link inline-flex items-center gap-1.5 ${pathname === m.href ? 'active' : ''}`}
                  >
                    {Icon && <Icon size={14} />}
                    {m.label}
                  </a>
                )}
                {hasChildren && openSub === m.id && (
                  <div
                    data-submenu-panel
                    className="absolute top-full left-0 mt-2 min-w-[260px] py-2 bg-[color:var(--bg)] border border-[color:var(--border)] rounded-xl shadow-2xl z-[60]"
                  >
                    {/* Lien vers la racine du menu (ex: /forum lui-même) */}
                    <a
                      href={fullHref}
                      onClick={() => setOpenSub(null)}
                      className="block px-4 py-2 text-xs uppercase font-bold tracking-wider text-zinc-400 hover:text-brand-pink hover:bg-white/5 border-b border-zinc-800/50 mb-1"
                    >
                      Aperçu : {m.label}
                    </a>
                    {m.children.map((c) => (
                      <a
                        key={c.id}
                        href={c.external ? c.href : `${localePrefix}${c.href}`}
                        target={c.external ? '_blank' : undefined}
                        onClick={() => setOpenSub(null)}
                        className="block px-4 py-2 text-sm hover:bg-white/5 hover:text-brand-pink transition"
                        style={{ color: 'var(--fg)' }}
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Mega-menus interactifs avec données live */}
          <MegaMenuTrigger label="Photos" type="gallery" locale={locale} />
          <MegaMenuTrigger label="Boutique" type="shop" locale={locale} />
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <CartBadge />
          <ThemeToggle />
          <select
            value={locale}
            onChange={(e) => {
              const newLocale = e.target.value;
              window.location.href = `/${newLocale}${pathname === '/' ? '' : pathname}`;
            }}
            className="bg-transparent border border-[color:var(--border)] rounded-full px-3 py-1 text-xs"
            style={{ color: 'var(--fg)' }}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l} style={{ background: 'var(--bg)', color: 'var(--fg)' }}>{l.toUpperCase()}</option>
            ))}
          </select>
          <a
            href={`${locale !== 'fr' ? `/${locale}` : ''}/participer`}
            className="border-2 border-[color:var(--accent)] text-[color:var(--accent)] uppercase text-sm font-bold tracking-wider px-5 py-2 rounded-full hover:bg-[color:var(--accent)] hover:text-white transition"
          >
            {t('participate')}
          </a>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <CartBadge />
          <ThemeToggle />
          <button onClick={() => setOpen(!open)} aria-label="menu" style={{ color: 'var(--fg)' }}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-3 bg-black/95 backdrop-blur-xl mt-2">
          {items.map((m) => {
            const localePrefix = locale !== 'fr' ? `/${locale}` : '';
            return (
              <div key={m.id}>
                <a href={m.external ? m.href : `${localePrefix}${m.href}`}
                   onClick={() => setOpen(false)}
                   className="text-white/90 hover:text-brand-pink uppercase text-sm font-semibold block">
                  {m.label}
                </a>
                {m.children?.length > 0 && (
                  <div className="ml-4 mt-2 flex flex-col gap-2">
                    {m.children.map((c) => (
                      <a key={c.id} href={c.external ? c.href : `${localePrefix}${c.href}`}
                         className="text-white/70 hover:text-brand-pink text-sm">{c.label}</a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <a href={`${locale !== 'fr' ? `/${locale}` : ''}/participer`} onClick={() => setOpen(false)}
             className="border-2 border-brand-pink text-brand-pink uppercase text-sm font-bold tracking-wider px-5 py-2 rounded-full text-center mt-2">
            {t('participate')}
          </a>
          <div className="flex items-center gap-2 pt-2">
            {LOCALES.map((l) => (
              <a key={l} href={`/${l}${pathname === '/' ? '' : pathname}`}
                 className={`text-xs px-3 py-1 rounded-full border ${l === locale ? 'border-brand-pink text-brand-pink' : 'border-white/20 text-white/70'}`}>
                {l.toUpperCase()}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
