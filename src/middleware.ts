import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * Middleware combiné :
 * - /admin/* (sauf /admin/login) : exige ADMIN ou EDITOR.
 *   USER simple connecté → /mon-espace.
 *   USER non connecté → /admin/login?next=…
 *   /admin/pro/* reste accessible aux non-admins (filtré par ownerId côté page).
 *   /admin/venues : non-admin redirigé vers /admin/pro/venues.
 * - Tout le reste → i18n next-intl.
 */
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Routes admin protégées
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET }).catch(() => null);

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }

    const role = (token.role as string) || '';
    const isAdmin = role === 'ADMIN' || role === 'EDITOR';

    // L'espace pro est accessible aux non-admins (filtré par ownerId côté page)
    if (pathname.startsWith('/admin/pro')) {
      return NextResponse.next();
    }

    // /admin/venues → non-admin redirigé vers le dashboard pro
    if (pathname.startsWith('/admin/venues') && !isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/pro';
      return NextResponse.redirect(url);
    }

    // Tout autre /admin/* → admin only
    if (!isAdmin) {
      const url = req.nextUrl.clone();
      url.pathname = '/mon-espace';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // 2) Routes /connect/* → on laisse passer SANS i18n (c'est un sous-app indépendant)
  if (pathname.startsWith('/connect')) {
    return NextResponse.next();
  }

  // 2.b) /rapport et autres pages globales sans locale → on laisse passer
  if (pathname === '/rapport' || pathname.startsWith('/rapport/')) {
    return NextResponse.next();
  }

  // 3) Routes publiques → i18n
  return intlMiddleware(req);
}

export const config = {
  // Élargi pour aussi intercepter /admin (pour les guards d'accès)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
