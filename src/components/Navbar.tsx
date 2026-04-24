'use client';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { NeonHeart } from './NeonHeart';
import { ThemeToggle } from './ThemeToggle';

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
    return () => window.removeEventListener('scroll', onScroll);
  }, [locale]);

  // Fallback hardcodé si DB vide
  const fallback: MenuItem[] = [
    { id: 'm', label: t('message'), href: '/message', external: false, children: [] },
    { id: 'a', label: t('argumentaire'), href: '/argumentaire', external: false, children: [] },
    { id: 'g', label: 'Photos', href: '/galerie', external: false, children: [] },
    { id: 'p', label: t('posters'), href: '/affiches', external: false, children: [] },
    { id: 'b', label: t('about'), href: '/a-propos', external: false, children: [] }
  ];
  const items = menu.length > 0 ? menu : fallback;

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-[color:var(--bg)]/70 border-b border-[color:var(--border)] py-2' : 'py-4'}`}>
      <div className="container-wide flex items-center justify-between">
        <a href="/" className="flex items-center gap-3 shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="h-12 object-contain" />
          ) : (
            <div className="w-12 h-12 shrink-0">
              <NeonHeart size={48} />
            </div>
          )}
          <div className="font-display font-black leading-none text-[color:var(--accent)] hidden sm:block">
            <div className="text-base">GOD</div>
            <div className="text-base">LOVES</div>
            <div className="text-base">DIVERSITY</div>
          </div>
        </a>

        <nav className="hidden lg:flex items-center gap-8">
          {items.map((m) => {
            const hasChildren = m.children?.length > 0;
            const localePrefix = locale !== 'fr' ? `/${locale}` : '';
            const fullHref = m.external ? m.href : `${localePrefix}${m.href}`;
            return (
              <div key={m.id} className="relative"
                   onMouseEnter={() => hasChildren && setOpenSub(m.id)}
                   onMouseLeave={() => setOpenSub(null)}>
                <a
                  href={fullHref}
                  target={m.external ? '_blank' : undefined}
                  rel={m.external ? 'noreferrer' : undefined}
                  className={`pill-nav-link inline-flex items-center gap-1 ${pathname === m.href ? 'active' : ''}`}
                >
                  {m.label}
                  {hasChildren && <ChevronDown size={12} />}
                </a>
                {hasChildren && openSub === m.id && (
                  <div className="absolute top-full left-0 mt-2 min-w-[200px] py-2 bg-[color:var(--bg)] border border-[color:var(--border)] rounded-lg shadow-2xl z-50">
                    {m.children.map((c) => (
                      <a key={c.id} href={c.external ? c.href : `${localePrefix}${c.href}`}
                         target={c.external ? '_blank' : undefined}
                         className="block px-4 py-2 text-sm hover:bg-white/5 hover:text-brand-pink transition"
                         style={{ color: 'var(--fg)' }}>
                        {c.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
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
