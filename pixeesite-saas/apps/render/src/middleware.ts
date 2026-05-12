import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware multi-tenant — Edge Runtime safe (PAS d'import @pixeesite/database).
 *
 * Le middleware Next.js tourne par défaut en Edge Runtime qui ne supporte pas
 * Node.js (Prisma, pg). Donc on fait UNIQUEMENT du parsing de host ici, et le
 * lookup custom domain est fait côté server component (apps/render/src/app/[[...slug]]/page.tsx).
 *
 * Cas gérés :
 *   1. <slug>.pixeeplay.com           → orgSlug = "<slug>"
 *   2. <slug>.pixeesite.app/.com      → idem (legacy)
 *   3. localhost / sslip.io           → ?org=<slug> en query param (dev)
 *   4. Custom domain (mon-site.com)   → header x-pixeesite-host transmis,
 *                                       résolution DB côté page.tsx
 */

const PLATFORM_DOMAINS = ['pixeesite.app', 'pixeesite.com', 'pixeeplay.com', 'render.pixeesite.app'];
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'app', 'api', 'pixeesite', 'render', 'docs', 'status']);

function getDevSlug(req: NextRequest): string | null {
  const queryOrg = req.nextUrl.searchParams.get('org');
  return queryOrg || null;
}

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0];

  // Skip API routes et static
  if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  let orgSlug: string | null = null;

  // Cas dev : header forcé ou ?org=
  const devSlug = req.headers.get('x-tenant-slug') || getDevSlug(req);
  if (devSlug) orgSlug = devSlug;

  // Cas 1 : subdomain *.pixeeplay.com / *.pixeesite.app / *.pixeesite.com
  if (!orgSlug) {
    for (const domain of PLATFORM_DOMAINS) {
      if (host.endsWith(`.${domain}`)) {
        const candidate = host.slice(0, -domain.length - 1).split('.')[0];
        if (candidate && !RESERVED_SUBDOMAINS.has(candidate)) {
          orgSlug = candidate;
        }
        break;
      }
    }
  }

  // Cas custom domain : pas de subdomain match → on laisse passer avec x-pixeesite-host.
  // Le server component (page.tsx) fera le lookup CustomDomain dans la platform DB.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pixeesite-host', host);
  if (orgSlug) requestHeaders.set('x-pixeesite-org-slug', orgSlug);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  if (orgSlug) res.headers.set('x-pixeesite-org-slug', orgSlug);
  res.headers.set('x-pixeesite-host', host);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
