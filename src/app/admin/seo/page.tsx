/**
 * /admin/seo — Page de pilotage des SEO boosts + orchestration globale.
 * Lance les jobs en background via API routes.
 */
import { headers } from 'next/headers';
import SeoBoostsClient from './SeoBoostsClient';

export const metadata = { title: 'SEO Boosts — LGBT Admin' };
export const dynamic = 'force-dynamic';

export default function SeoBoostsPage() {
  const host = headers().get('host') || '';
  // Heuristique : tout ce qui n'est pas parislgbt.com / lgbtfrance.fr = environnement de test
  const isProd = host === 'parislgbt.com' || host === 'www.parislgbt.com' || host === 'lgbtfrance.fr' || host === 'www.lgbtfrance.fr';
  return <SeoBoostsClient isProd={isProd} host={host} />;
}
