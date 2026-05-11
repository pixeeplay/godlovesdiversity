import { headers } from 'next/headers';
import { getTenantPrisma, platformDb } from '@pixeesite/database';

/** Resolve the current org from the middleware-injected header. */
export async function getCurrentOrg() {
  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug');
  if (!orgSlug) return null;
  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true, name: true, primaryColor: true, font: true, logoUrl: true, defaultDomain: true, plan: true, tenantDbReady: true },
  });
  return org;
}

export async function getCurrentTenantDb() {
  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug');
  if (!orgSlug) return null;
  return getTenantPrisma(orgSlug);
}
