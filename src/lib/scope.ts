/**
 * Multi-domain scope helper for parislgbt.com / francelgbt.com / lgbt.pixeeplay.com.
 *
 * Detects which "site" the current request is for, based on the hostname:
 * - parislgbt.com    → SITE_SCOPE = 'paris'   (Paris-only content)
 * - francelgbt.com   → SITE_SCOPE = 'france'  (all France content)
 * - lgbt.pixeeplay.com → SITE_SCOPE = 'staging'  (toggle Paris/France via switcher)
 * - localhost / dev  → SITE_SCOPE = 'dev' (everything)
 *
 * The middleware injects the scope into a header `x-site-scope` so that
 * server components and API routes can read it via `getScope()`.
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
  if (h.includes('francelgbt.com')) return 'france';
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
 * Returns a Prisma `where` filter to apply automatically to scoped queries.
 *
 * - paris → only places/events tagged with PARIS scope (or city='Paris')
 * - france → all places (no filter)
 * - staging/dev → no filter (admin can switch view manually)
 */
export function scopedWhere(scope: Scope): Record<string, unknown> {
  if (scope === 'paris') {
    // OR: city is Paris OR scope array contains PARIS
    return { OR: [{ city: 'Paris' }, { scope: { has: 'PARIS' as const } }] };
  }
  return {};
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
