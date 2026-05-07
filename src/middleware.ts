import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { routing } from './i18n/routing';
import { detectScope } from './lib/scope';

const intlMiddleware = createMiddleware(routing);

/**
 * Middleware combiné :
 * - /admin/*   → SANS i18n. Login pages (/admin/login, /admin2access) passent.
 *                Le reste exige ADMIN/EDITOR (sinon redirect vers /admin/login).
 * - /connect/* → sous-app indépendant, sans i18n
 * - /rapport   → page globale, sans i18n
 * - reste      → next-intl
 *
 * IMPORTANT : tous les `/admin*` retournent NextResponse.next() — ils NE
 * doivent JAMAIS tomber dans intlMiddleware sinon next-intl rewrite vers
 * /fr/admin/* qui n'existe pas → 404.
 */
export default async function middleware(req: NextRequest) {
  // Multi-domain scope detection (parislgbt.com / francelgbt.com / lgbt.pixeeplay.com)
  const hostHeader = req.headers.get('host') ?? '';
  const scope = detectScope(hostHeader);
  // We propagate the scope via request headers so server components can read it
  req.headers.set('x-site-scope', scope);

  const { pathname } = req.nextUrl;

  // === Bloc 0 : routes admin (toutes, login + protégées + page de secours) ===
  // Bypass complet de next-intl. Les pages de login passent telles quelles.
  if (pathname.startsWith('/admin') || pathname.startsWith('/admin2access')) {
    // Pages de login publiques → laisser passer
    const isPublicLoginPage =
      pathname.startsWith('/admin/login') || pathname.startsWith('/admin2access');

    if (isPublicLoginPage) {
      return (() => { const r = NextResponse.next(); r.headers.set('x-site-scope', scope); return r; })();
    }

    // Tailscale ACL — bloque l'accès admin depuis Internet public si flag activé
    if (process.env.ADMIN_TAILSCALE_ONLY === 'true' || process.env.ADMIN_TAILSCALE_ONLY === '1') {
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        (req as any).ip ||
        '';
      const isTailscaleIp = /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip);
      const isLocalhost =
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip.startsWith('10.') ||
        ip.startsWith('172.') ||
        ip.startsWith('192.168.');
      if (!isTailscaleIp && !isLocalhost && ip !== '') {
        return new NextResponse('🔒 Accès admin restreint au réseau Tailscale.', {
          status: 403,
          headers: { 'content-type': 'text/plain; charset=utf-8' }
        });
      }
    }

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    const role = (token.role as string) || '';
    const isAdmin = role === 'ADMIN' || role === 'EDITOR';

    if (pathname.startsWith('/admin/pro')) {
      return (() => { const r = NextResponse.next(); r.headers.set('x-site-scope', scope); return r; })();
    }

    if (pathname.startsWith('/admin/venues') && !isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/pro';
      return NextResponse.redirect(url);
    }

    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/mon-espace';
      return NextResponse.redirect(url);
    }

    return (() => { const r = NextResponse.next(); r.headers.set('x-site-scope', scope); return r; })();
  }

  // === Bloc 1 : sous-apps indépendants ===
  if (pathname.startsWith('/connect')) {
    return NextResponse.next();
  }

  // === Bloc 2 : pages globales sans locale ===
  if (pathname === '/rapport' || pathname.startsWith('/rapport/')) {
    return NextResponse.next();
  }

  // === Bloc 3 : tout le reste → i18n ===
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
