import { NextRequest, NextResponse } from 'next/server';
import { getCountryHelp, GLOBAL_HOTLINES } from '@/lib/lgbt-helplines';

export const dynamic = 'force-dynamic';

/**
 * GET /api/emergency?country=FR
 * Renvoie les contacts d'aide LGBTQ+ pour un pays.
 * Si pas de country fourni, tente de le déduire du header Cloudflare CF-IPCountry,
 * sinon Vercel x-vercel-ip-country, sinon renvoie les hotlines globales.
 */
export async function GET(req: NextRequest) {
  const explicit = req.nextUrl.searchParams.get('country')?.toUpperCase();
  const headerCountry =
    req.headers.get('cf-ipcountry') ||
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('x-country-code');

  const country = explicit || headerCountry?.toUpperCase() || null;

  const help = country ? getCountryHelp(country) : null;
  return NextResponse.json({
    detectedCountry: country,
    help,
    global: GLOBAL_HOTLINES,
    fallbackMessage: !help ? `Aucune ressource locale pour ${country || 'ce pays'} dans notre base — utilise les contacts internationaux ci-dessous.` : null
  });
}
