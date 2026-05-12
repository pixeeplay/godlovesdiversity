'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export interface SiteNavPage {
  slug: string;
  title: string;
}

export interface SiteHeaderProps {
  siteName: string;
  /** Slug du site (= prefixe URL pour les pages, "" si site racine de l'org) */
  siteSlug?: string;
  /** Toutes les pages visibles du site, déjà triées (home en 1er) */
  pages: SiteNavPage[];
  /** Slug de la page courante, ex `/` ou `/about` */
  currentSlug: string;
  /** Couleur primaire (override CSS var en cas de besoin) */
  primary?: string;
  /** Logo url depuis l'org */
  logoUrl?: string | null;
}

/**
 * Header de navigation auto pour les sites publics Pixeesite.
 *
 * - sticky en haut
 * - logo + nom site à gauche
 * - liens vers chaque page à droite (mobile : burger)
 * - glassmorphism backdrop-filter blur
 * - hover subtil, current page highlightée
 *
 * 100% piloté par les CSS vars du theme (--pxs-primary, --pxs-foreground, etc.)
 * → reste theme-agnostique entre les sites.
 */
export function SiteHeader({ siteName, siteSlug, pages, currentSlug, primary, logoUrl }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const prefix = siteSlug ? `/${siteSlug}` : '';
  const homeHref = `${prefix}/`;
  const buildHref = (slug: string) => {
    if (slug === '/') return homeHref;
    return `${prefix}${slug.startsWith('/') ? slug : `/${slug}`}`;
  };

  return (
    <>
      <header
        className="pxs-site-header"
        data-scrolled={scrolled ? 'true' : 'false'}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          width: '100%',
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          background: scrolled
            ? 'color-mix(in srgb, var(--pxs-background, #0a0a0f) 80%, transparent)'
            : 'color-mix(in srgb, var(--pxs-background, #0a0a0f) 55%, transparent)',
          borderBottom: scrolled
            ? '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 12%, transparent)'
            : '1px solid transparent',
          transition: 'background .25s ease, border-color .25s ease',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <Link
            href={homeHref}
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} style={{ height: 32, width: 'auto', display: 'block', borderRadius: 6 }} />
            ) : (
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, var(--pxs-primary, #d946ef), var(--pxs-secondary, #06b6d4))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 14,
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px -4px var(--pxs-primary, #d946ef)',
                }}
              >
                {(siteName || 'PX').slice(0, 2).toUpperCase()}
              </span>
            )}
            <span style={{ fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {siteName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="pxs-nav-desktop" style={{ display: 'flex', gap: 4, marginLeft: 'auto', fontSize: 14 }}>
            {pages.map((p) => {
              const active = p.slug === currentSlug;
              return (
                <Link
                  key={p.slug}
                  href={buildHref(p.slug)}
                  className="pxs-nav-link"
                  data-active={active ? 'true' : 'false'}
                  style={{
                    color: active ? 'var(--pxs-primary, #d946ef)' : 'inherit',
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                    padding: '8px 14px',
                    borderRadius: 8,
                    transition: 'background .15s, color .15s',
                    opacity: active ? 1 : 0.82,
                  }}
                >
                  {p.title}
                </Link>
              );
            })}
          </nav>

          {/* Mobile burger */}
          <button
            type="button"
            className="pxs-nav-burger"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            style={{
              marginLeft: 'auto',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 8,
              border: '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 18%, transparent)',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            className="pxs-nav-mobile-panel"
            style={{
              borderTop: '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 12%, transparent)',
              padding: '8px 16px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {pages.map((p) => {
              const active = p.slug === currentSlug;
              return (
                <Link
                  key={p.slug}
                  href={buildHref(p.slug)}
                  onClick={() => setOpen(false)}
                  style={{
                    color: active ? 'var(--pxs-primary, #d946ef)' : 'inherit',
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                    padding: '12px 14px',
                    borderRadius: 8,
                    fontSize: 15,
                    opacity: active ? 1 : 0.85,
                  }}
                >
                  {p.title}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      <style>{`
        .pxs-site-header .pxs-nav-link:hover {
          background: color-mix(in srgb, var(--pxs-primary, #d946ef) 12%, transparent);
          opacity: 1;
        }
        @media (max-width: 760px) {
          .pxs-site-header .pxs-nav-desktop { display: none !important; }
          .pxs-site-header .pxs-nav-burger { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
