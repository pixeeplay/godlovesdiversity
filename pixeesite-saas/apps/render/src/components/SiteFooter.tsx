import Link from 'next/link';
import type { SiteNavPage } from './SiteHeader';

export interface SiteFooterSocial {
  /** Type/label : "Instagram", "Facebook", "YouTube", "X", "TikTok", "LinkedIn", "Site web", … */
  label: string;
  url: string;
}

export interface SiteFooterProps {
  siteName: string;
  orgName: string;
  siteSlug?: string;
  /** Toutes les pages visibles, déjà triées (home en 1er) */
  pages: SiteNavPage[];
  /** Description / tagline courte affichée sous le nom */
  description?: string | null;
  /** Liens sociaux (Site.settings.socials ou similaire) */
  socials?: SiteFooterSocial[] | null;
}

/**
 * Footer 4 colonnes pour les sites publics Pixeesite.
 *
 * Colonnes :
 *  1. Logo / Nom du site + description
 *  2. Pages (nav inter-pages)
 *  3. Réseaux sociaux
 *  4. Propulsé par Pixeesite
 *
 * Theme-agnostique : tout passe par les CSS vars --pxs-*.
 */
export function SiteFooter({ siteName, orgName, siteSlug, pages, description, socials }: SiteFooterProps) {
  const prefix = siteSlug ? `/${siteSlug}` : '';
  const buildHref = (slug: string) => {
    if (slug === '/') return `${prefix}/`;
    return `${prefix}${slug.startsWith('/') ? slug : `/${slug}`}`;
  };

  const safeSocials = (socials || []).filter((s) => s && s.url && s.label);

  return (
    <footer
      style={{
        marginTop: 80,
        position: 'relative',
        background:
          'linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--pxs-background, #0a0a0f) 92%, black 8%) 60%, color-mix(in srgb, var(--pxs-background, #0a0a0f) 80%, black 20%) 100%)',
        borderTop: '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent)',
        color: 'var(--pxs-foreground, #fafafa)',
        fontFamily: 'var(--pxs-font-body, "Inter", system-ui, sans-serif)',
      }}
    >
      {/* gradient accent ligne */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -1,
          left: 0,
          right: 0,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 0%, var(--pxs-primary, #d946ef) 35%, var(--pxs-secondary, #06b6d4) 65%, transparent 100%)',
          opacity: 0.55,
        }}
      />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '56px 24px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 40,
        }}
      >
        {/* Col 1 — Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  'linear-gradient(135deg, var(--pxs-primary, #d946ef), var(--pxs-secondary, #06b6d4))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 14,
                color: 'white',
              }}
            >
              {(siteName || 'PX').slice(0, 2).toUpperCase()}
            </span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>{siteName}</span>
          </div>
          {description && (
            <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.65, margin: 0, maxWidth: 280 }}>
              {description}
            </p>
          )}
        </div>

        {/* Col 2 — Pages */}
        <div>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              opacity: 0.55,
              margin: '0 0 16px',
            }}
          >
            Pages
          </h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={buildHref(p.slug)}
                  style={{
                    color: 'inherit',
                    textDecoration: 'none',
                    fontSize: 14,
                    opacity: 0.82,
                  }}
                >
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3 — Socials */}
        <div>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              opacity: 0.55,
              margin: '0 0 16px',
            }}
          >
            Suivre
          </h4>
          {safeSocials.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {safeSocials.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none', fontSize: 14, opacity: 0.82 }}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 13, opacity: 0.55, margin: 0, lineHeight: 1.6 }}>
              Bientôt sur les réseaux.
            </p>
          )}
        </div>

        {/* Col 4 — Propulsé par */}
        <div>
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              opacity: 0.55,
              margin: '0 0 16px',
            }}
          >
            Propulsé par
          </h4>
          <a
            href="https://pixeesite.pixeeplay.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'inherit',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 18%, transparent)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: 5,
                background:
                  'linear-gradient(135deg, var(--pxs-primary, #d946ef), var(--pxs-secondary, #06b6d4))',
                display: 'inline-block',
              }}
            />
            Pixeesite
          </a>
          <p style={{ fontSize: 12, opacity: 0.5, margin: '12px 0 0', lineHeight: 1.5 }}>
            Crée ton site multi-pages en quelques minutes.
          </p>
        </div>
      </div>

      <div
        style={{
          borderTop: '1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 8%, transparent)',
          padding: '20px 24px',
          textAlign: 'center',
          fontSize: 12,
          opacity: 0.55,
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        © {new Date().getFullYear()} {orgName} — Tous droits réservés.
      </div>
    </footer>
  );
}
