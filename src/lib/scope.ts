/**
 * Multi-domain scope helper for parislgbt.com / lgbtfrance.fr / lgbt.pixeeplay.com.
 *
 * Cercles concentriques :
 *   - parislgbt.com   → 'paris'  : SOUS-ENSEMBLE de France (city=Paris OU CP 75xxx)
 *   - lgbtfrance.fr   → 'france' : TOUT (Paris inclus, mais angle régional)
 *   - lgbt.pixeeplay  → 'staging': bascule manuelle via switcher BO
 *   - localhost       → 'dev'    : tout
 *
 * Le middleware injecte `x-site-scope` dans les headers pour que server components
 * et API routes lisent le scope via `getScope()`.
 */
import { headers } from 'next/headers';

export type Scope = 'paris' | 'france' | 'staging' | 'dev';

/**
 * Detect scope from hostname. Pure, easy to test.
 */
export function detectScope(hostname: string | null | undefined): Scope {
  if (!hostname) return 'dev';
  const h = hostname.toLowerCase();
  if (h.includes('parislgbt.com')) return 'paris';
  if (h.includes('lgbtfrance.fr') || h.includes('francelgbt.com')) return 'france';
  if (h.includes('lgbt.pixeeplay.com') || h.includes('lgbt.pixelplay.com')) return 'staging';
  return 'dev';
}

/**
 * Server-side: read the scope from the middleware-injected header.
 * Use this in server components and route handlers.
 */
export function getScope(): Scope {
  try {
    const h = headers();
    const fromHeader = h.get('x-site-scope') as Scope | null;
    if (fromHeader) return fromHeader;
    const host = h.get('host');
    return detectScope(host);
  } catch {
    return 'dev';
  }
}

/**
 * Returns a Prisma `where` filter for the Listing/Place model.
 *
 * Cercles concentriques (Paris ⊂ France) :
 *   - paris   → city=Paris OU CP 75xxx (sous-ensemble géo)
 *   - france  → TOUT (Paris inclus, mais affiché avec angle régional)
 *   - staging/dev → no filter
 */
export function scopedWhere(scope: Scope): Record<string, unknown> {
  if (scope === 'paris') {
    return {
      OR: [
        { city: { equals: 'Paris', mode: 'insensitive' as const } },
        { postal_code: { startsWith: '75' } }
      ]
    };
  }
  return {};
}

/**
 * Site domain par scope — pour filtrer par site_id en multi-tenant.
 */
export function siteDomain(scope: Scope): string {
  if (scope === 'paris') return 'parislgbt.com';
  if (scope === 'france') return 'lgbtfrance.fr';
  return 'lgbt.pixeeplay.com';
}

/**
 * Prisma where filter par site_id (multi-tenant Site model).
 * À utiliser dans les queries Listing/DirectoryEvent.
 */
export async function scopedSiteWhere(scope: Scope, prisma: any): Promise<Record<string, unknown>> {
  const domain = siteDomain(scope);
  const site = await prisma.site.findUnique({ where: { domain } }).catch(() => null);
  if (!site) return {};
  return { site_id: site.id };
}

/**
 * Display label for the scope (e.g. for ScopeSwitch component).
 */
export function scopeLabel(scope: Scope): string {
  switch (scope) {
    case 'paris': return 'Paris';
    case 'france': return 'France entière';
    case 'staging': return 'Staging (toggle)';
    case 'dev': return 'Dev (all)';
  }
}

/**
 * Returns the URL of the "other" scope domain (used by ScopeSwitch component).
 */
export function otherScopeUrl(scope: Scope, path = '/'): string {
  const PARIS_URL = process.env.NEXT_PUBLIC_PARIS_URL || 'https://parislgbt.com';
  const FRANCE_URL = process.env.NEXT_PUBLIC_FRANCE_URL || 'https://francelgbt.com';
  if (scope === 'paris') return `${FRANCE_URL}${path}`;
  if (scope === 'france') return `${PARIS_URL}${path}`;
  return '#';
}
