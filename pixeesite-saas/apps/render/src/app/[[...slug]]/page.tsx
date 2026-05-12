import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { getTenantPrisma, platformDb } from '@pixeesite/database';
import { PageBlocksRenderer, EffectsStyles, ThemeProvider, GoogleFontsLoader, type Block, type SiteTheme } from '@pixeesite/blocks';
import { SiteHeader, type SiteNavPage } from '@/components/SiteHeader';
import { SiteFooter, type SiteFooterSocial } from '@/components/SiteFooter';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * Catch-all multi-sites par org.
 *
 *   URL : /                    → si l'org a 1 seul site published → home de ce site
 *                              → si l'org a plusieurs sites → index listant les sites
 *   URL : /<site-slug>         → home du site <site-slug>
 *   URL : /<site-slug>/<path>  → page <path> du site <site-slug>
 *
 * Le orgSlug vient du middleware via header x-pixeesite-org-slug.
 */
export default async function TenantPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const h = headers();
  let orgSlug = h.get('x-pixeesite-org-slug');

  // Custom domain lookup (Edge middleware peut pas faire DB → on le fait ici)
  if (!orgSlug) {
    const host = h.get('x-pixeesite-host') || h.get('host') || '';
    if (host && !host.includes('localhost')) {
      try {
        const cd = await platformDb.customDomain.findUnique({
          where: { domain: host },
          select: { verified: true, org: { select: { slug: true } } },
        });
        if (cd?.verified) orgSlug = cd.org.slug;
      } catch {
        // DB down → fall through to notFound
      }
    }
  }

  if (!orgSlug) notFound();

  // 1. Trouve l'org + TOUS ses sites published
  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: {
      id: true,
      name: true,
      primaryColor: true,
      font: true,
      logoUrl: true,
      sites: {
        where: { status: 'published' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, slug: true, theme: true, name: true, description: true, pageCount: true, settings: true },
      },
    },
  });
  if (!org) notFound();

  const segments = slug || [];

  // Cas A : URL racine `/`
  if (segments.length === 0) {
    if (org.sites.length === 0) {
      // Aucun site publié → landing par défaut
      return <EmptyOrgLanding orgName={org.name} orgSlug={orgSlug} />;
    }
    if (org.sites.length === 1) {
      // Un seul site → on rend sa home directement à `/` (pas de prefix de slug)
      return await renderSitePage(org, orgSlug, org.sites[0]!, '/', '');
    }
    // Plusieurs sites → index
    return <SitesIndex org={org} />;
  }

  // Cas B : URL avec segments → 1er segment = site slug
  const siteSlug = segments[0]!;
  const site = org.sites.find((s) => s.slug === siteSlug);
  if (!site) notFound();

  const pagePath = segments.length > 1 ? '/' + segments.slice(1).join('/') : '/';
  // Si l'org n'a qu'un seul site et que l'URL contient son slug, on garde le prefix
  // pour rester cohérent avec les liens (sinon header/footer pointeraient vers /<slug>/...)
  return await renderSitePage(org, orgSlug, site, pagePath, siteSlug);
}

// ── Rendu d'une page d'un site ─────────────────────────────────────────────

async function renderSitePage(
  org: any,
  orgSlug: string,
  site: { id: string; slug: string; theme: any; name: string; description?: string | null; settings?: any },
  pagePath: string,
  siteSlugPrefix: string
) {
  const tenantDb = await getTenantPrisma(orgSlug);

  // 1) page courante
  const page = await tenantDb.sitePage.findFirst({
    where: { siteId: site.id, slug: pagePath, visible: true },
  });
  if (!page) notFound();

  // 2) toutes les pages visibles pour la nav (home en 1er, puis slug ASC)
  const allPages = await tenantDb.sitePage.findMany({
    where: { siteId: site.id, visible: true },
    orderBy: [{ isHome: 'desc' }, { slug: 'asc' }],
    select: { slug: true, title: true },
  });
  const pagesNav: SiteNavPage[] = allPages.map((p) => ({ slug: p.slug, title: p.title }));

  // Theme : fallback Org (primaryColor + font global), puis SITE.theme OVERRIDE.
  // Site.theme est le résultat du wizard (palette dérivée + fonts whitelistées).
  const orgFallback: SiteTheme = {
    primary: org.primaryColor || undefined,
    fontHeading: org.font || undefined,
    fontBody: org.font || undefined,
    fontHeadingName: org.font || undefined,
    fontBodyName: org.font || undefined,
  };
  const siteOverride = (site.theme as SiteTheme | null) || {};
  const theme: SiteTheme = { ...orgFallback, ...siteOverride };

  const blocks = (page.blocks as unknown as Block[]) || [];

  // Sociaux : on accepte Site.settings.socials (array { label, url }) ou Org.socials
  let socials: SiteFooterSocial[] = [];
  const rawSocials = (site.settings as any)?.socials ?? (org as any)?.socials;
  if (Array.isArray(rawSocials)) {
    socials = rawSocials
      .map((s: any) => ({ label: String(s?.label || s?.name || s?.type || ''), url: String(s?.url || s?.href || '') }))
      .filter((s: SiteFooterSocial) => s.label && s.url);
  }

  return (
    <ThemeProvider theme={theme}>
      <GoogleFontsLoader theme={theme} />
      <EffectsStyles />
      <SiteHeader
        siteName={site.name}
        siteSlug={siteSlugPrefix}
        pages={pagesNav}
        currentSlug={pagePath}
        logoUrl={org.logoUrl}
      />
      <main>
        <PageBlocksRenderer blocks={blocks} theme={theme} />
      </main>
      <SiteFooter
        siteName={site.name}
        orgName={org.name}
        siteSlug={siteSlugPrefix}
        pages={pagesNav}
        description={site.description || null}
        socials={socials}
      />
    </ThemeProvider>
  );
}

// ── Composant : landing org sans site publié ──────────────────────────────

function EmptyOrgLanding({ orgName, orgSlug }: { orgName: string; orgSlug: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚧</div>
        <h1 style={{ fontSize: 36, margin: 0, fontWeight: 800 }}>{orgName}</h1>
        <p style={{ fontSize: 16, opacity: 0.7, marginTop: 12 }}>Aucun site publié pour cette organisation.</p>
        <p style={{ fontSize: 13, opacity: 0.5, marginTop: 24 }}>
          Tu es l'admin ? Va sur{' '}
          <Link href={`https://pixeesite.pixeeplay.com/dashboard/orgs/${orgSlug}/sites`} style={{ color: '#d946ef' }}>
            le dashboard
          </Link>{' '}
          pour publier un site.
        </p>
      </div>
    </div>
  );
}

// ── Composant : index des sites d'un org ──────────────────────────────────

function SitesIndex({ org }: { org: any }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'relative', overflow: 'hidden', padding: '80px 24px 40px', textAlign: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: -100, left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, #d946ef 0%, transparent 60%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', top: 50, right: '15%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, #06b6d4 0%, transparent 60%)', filter: 'blur(50px)' }} />
        </div>
        <div style={{ position: 'relative' }}>
          {org.logoUrl && (
            <img src={org.logoUrl} alt={org.name} style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', marginBottom: 18 }} />
          )}
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, margin: 0, letterSpacing: -1 }}>
            <span style={{ background: 'linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{org.name}</span>
          </h1>
          <p style={{ fontSize: 17, opacity: 0.7, marginTop: 14 }}>
            {org.sites.length} {org.sites.length > 1 ? 'sites' : 'site'} à découvrir
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {org.sites.map((s: any, i: number) => {
            const gradients = [
              'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
              'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
              'linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)',
            ];
            const g = gradients[i % gradients.length]!;
            return (
              <Link key={s.id} href={`/${s.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <article style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 16, overflow: 'hidden', transition: 'transform .2s, border-color .2s', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 140, background: g, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <span style={{ fontSize: 48, opacity: 0.4 }}>✨</span>
                    <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9 }}>{s.pageCount || 1} {s.pageCount > 1 ? 'pages' : 'page'}</div>
                  </div>
                  <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>{s.name}</h2>
                    {s.description && (
                      <p style={{ fontSize: 13, opacity: 0.65, margin: '0 0 12px', lineHeight: 1.45, flex: 1 }}>{s.description}</p>
                    )}
                    <div style={{ fontSize: 12, color: '#d946ef', fontWeight: 600, marginTop: 'auto' }}>
                      Visiter <span style={{ opacity: 0.6 }}>/{s.slug}</span> →
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>

      <footer style={{ padding: '24px', textAlign: 'center', borderTop: '1px solid #27272a', fontSize: 12, opacity: 0.5 }}>
        Propulsé par{' '}
        <a href="https://pixeesite.pixeeplay.com" style={{ color: '#d946ef', textDecoration: 'none' }}>Pixeesite</a>
      </footer>
    </div>
  );
}

// ── Metadata par page ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }) {
  const orgSlug = headers().get('x-pixeesite-org-slug');
  if (!orgSlug) return { title: 'Pixeesite' };
  const { slug } = await params;
  const segments = slug || [];

  try {
    const org = await platformDb.org.findUnique({
      where: { slug: orgSlug },
      select: { name: true, sites: { where: { status: 'published' }, orderBy: { createdAt: 'asc' }, select: { id: true, slug: true, name: true } } },
    });
    if (!org) return { title: 'Pixeesite' };

    // Cas index org (path vide + plusieurs sites)
    if (segments.length === 0) {
      if (org.sites.length <= 1) {
        // 0 ou 1 site → on retombe sur la home si elle existe
        if (org.sites[0]) {
          const tenantDb = await getTenantPrisma(orgSlug);
          const page = await tenantDb.sitePage.findFirst({ where: { siteId: org.sites[0].id, slug: '/' }, select: { title: true, meta: true } });
          const meta: any = page?.meta || {};
          return { title: meta.title || `${page?.title || org.sites[0].name} · ${org.name}`, description: meta.description };
        }
        return { title: org.name };
      }
      return { title: `${org.name} — ${org.sites.length} sites` };
    }

    // Cas page d'un site
    const site = org.sites.find((s) => s.slug === segments[0]);
    if (!site) return { title: org.name };
    const pagePath = segments.length > 1 ? '/' + segments.slice(1).join('/') : '/';
    const tenantDb = await getTenantPrisma(orgSlug);
    const page = await tenantDb.sitePage.findFirst({ where: { siteId: site.id, slug: pagePath }, select: { title: true, meta: true } });
    const meta: any = page?.meta || {};
    return {
      title: meta.title || `${page?.title || site.name} · ${org.name}`,
      description: meta.description,
      openGraph: meta.ogImage ? { images: [meta.ogImage] } : undefined,
    };
  } catch {
    return { title: 'Pixeesite' };
  }
}
