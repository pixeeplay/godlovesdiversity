/**
 * /admin/seo — Page de pilotage des 3 SEO boosts.
 * Lance les jobs en background via API routes.
 */
import SeoBoostsClient from './SeoBoostsClient';

export const metadata = { title: 'SEO Boosts — LGBT Admin' };
export const dynamic = 'force-dynamic';

export default function SeoBoostsPage() {
  return <SeoBoostsClient />;
}
