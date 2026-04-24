'use client';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { NeonHeart } from './NeonHeart';
import { ThemeToggle } from './ThemeToggle';

const LOCALES = ['fr', 'en', 'es', 'pt'] as const;

export function Navbar() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch('/api/branding').then((r) => r.json()).then((j) => setLogoUrl(j.logoUrl || ''));
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/message', label: t('message') },
    { href: '/argumentaire', label: t('argumentaire') },
    { href: '/galerie', label: 'Photos' },
    { href: '/affiches', label: t('posters') },
    { href: '/a-propos', label: t('about') }
  ];

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-[color:var(--bg)]/70 border-b border-[color:var(--border)] py-2' : 'py-4'}`}>
      <div className="container-wide flex items-center justify-between">
        {/* Logo gauche : cœur néon stylisé + texte sur 3 lignes */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
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
        </Link>

        {/* Nav centre */}
        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href as any}
              className={`pill-nav-link ${pathname === l.href ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right : langue + theme + CTA cerclé */}
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
          <Link
            href="/participer"
            className="border-2 border-[color:var(--accent)] text-[color:var(--accent)] uppercase text-sm font-bold tracking-wider px-5 py-2 rounded-full hover:bg-[color:var(--accent)] hover:text-white transition"
          >
            {t('participate')}
          </Link>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setOpen(!open)}
            aria-label="menu"
            style={{ color: 'var(--fg)' }}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="lg:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-3 bg-black/95 backdrop-blur-xl mt-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href as any}
              onClick={() => setOpen(false)}
              className="text-white/90 hover:text-brand-pink uppercase text-sm font-semibold"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/participer" onClick={() => setOpen(false)}
            className="border-2 border-brand-pink text-brand-pink uppercase text-sm font-bold tracking-wider px-5 py-2 rounded-full text-center mt-2">
            {t('participate')}
          </Link>
          <div className="flex items-center gap-2 pt-2">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={`/${l}${pathname === '/' ? '' : pathname}`}
                className={`text-xs px-3 py-1 rounded-full border ${l === locale ? 'border-brand-pink text-brand-pink' : 'border-white/20 text-white/70'}`}
              >
                {l.toUpperCase()}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
