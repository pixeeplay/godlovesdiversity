import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';

/**
 * Middleware multi-tenant : résout l'org à partir du host.
 *
 * 3 cas :
 *   1. arnaud.pixeesite.app   → orgSlug = "arnaud" (subdomain)
 *   2. arnaud-photo.com       → DB lookup CustomDomain → orgSlug
 *   3. localhost:3001         → header X-Tenant-Slug forcé (dev)
 *
 * Le orgSlug résolu est passé via header `x-pixeesite-org-slug` aux
 * pages serveur qui peuvent ensuite getTenantPrisma(slug).
 */

const PLATFORM_DOMAINS = ['pixeesite.app', 'pixeesite.com', 'render.pixeesite.app'];

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];

  // Skip API routes and static
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let orgSlug: string | null = null;

  // Cas dev : header forcé
  const devSlug = req.headers.get('x-tenant-slug');
  if (devSlug) orgSlug = devSlug;

  // Cas 1 : subdomain *.pixeesite.app / *.pixeesite.com
  if (!orgSlug) {
    for (const domain of PLATFORM_DOMAINS) {
      if (host.endsWith(`.${domain}`)) {
        orgSlug = host.slice(0, -domain.length - 1).split('.')[0];
        break;
      }
    }
  }

  // Cas 2 : custom domain → DB lookup
  if (!orgSlug && !PLATFORM_DOMAINS.includes(host) && !host.includes('localhost')) {
    try {
      const cd = await platformDb.customDomain.findUnique({
        where: { domain: host },
        select: { verified: true, org: { select: { slug: true } } },
      });
      if (cd?.verified) orgSlug = cd.org.slug;
    } catch {
      // DB unavailable → laisser passer en mode dégradé
    }
  }

  if (!orgSlug) {
    // Pas d'org résolu : page d'erreur platform
    return NextResponse.rewrite(new URL('/_unknown-org', req.url));
  }

  // Inject le slug dans les headers pour que les pages serveur le récupèrent
  const res = NextResponse.next();
  res.headers.set('x-pixeesite-org-slug', orgSlug);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
