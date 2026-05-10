/**
 * Tenant Prisma client factory.
 *
 * Pour chaque org, on a besoin d'un client Prisma connecté à SA DB tenant.
 * On cache les clients par orgSlug pour éviter de rouvrir une connexion à
 * chaque appel (les connexions sont coûteuses).
 *
 * Usage:
 *   const tenantDb = await getTenantPrisma('arnaud-photo');
 *   const pages = await tenantDb.sitePage.findMany();
 */
import { PrismaClient as TenantClient } from '../node_modules/.prisma/tenant-client';
import { platformDb } from './platform';

const tenantClients = new Map<string, TenantClient>();

/** Construit l'URL Postgres pour la DB du tenant à partir de son slug. */
function buildTenantDbUrl(orgSlug: string, dbName: string): string {
  const template = process.env.TENANT_DATABASE_URL_TEMPLATE;
  if (template) {
    // Remplace {orgSlug} par le slug et {dbName} par le nom DB
    return template
      .replace('{orgSlug}', orgSlug)
      .replace('{dbName}', dbName);
  }
  // Fallback: parse PLATFORM_DATABASE_URL et change juste le path /dbName
  const platformUrl = process.env.PLATFORM_DATABASE_URL;
  if (!platformUrl) throw new Error('PLATFORM_DATABASE_URL is required');
  const url = new URL(platformUrl);
  url.pathname = `/${dbName}`;
  return url.toString();
}

/**
 * Récupère (ou crée) un client Prisma pour le tenant.
 * Lookup l'org dans la platform DB pour obtenir le tenantDbName.
 */
export async function getTenantPrisma(orgSlug: string): Promise<TenantClient> {
  // Cache
  if (tenantClients.has(orgSlug)) {
    return tenantClients.get(orgSlug)!;
  }

  // Lookup org → tenantDbName
  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true, tenantDbName: true, tenantDbReady: true },
  });
  if (!org) throw new Error(`Org "${orgSlug}" not found`);
  if (!org.tenantDbName) throw new Error(`Org "${orgSlug}" has no tenantDbName (DB not provisioned)`);
  if (!org.tenantDbReady) throw new Error(`Org "${orgSlug}" tenant DB not ready (provisioning)`);

  // Build URL + open client
  const dbUrl = buildTenantDbUrl(org.slug, org.tenantDbName);
  const client = new TenantClient({
    datasourceUrl: dbUrl,
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

  tenantClients.set(orgSlug, client);
  return client;
}

/** Ferme tous les clients tenants (utile pour les workers / cron). */
export async function closeAllTenantPrisma(): Promise<void> {
  await Promise.all(Array.from(tenantClients.values()).map((c) => c.$disconnect()));
  tenantClients.clear();
}

/** Vide le cache pour un tenant (utile après provisioning). */
export function invalidateTenantPrisma(orgSlug: string): void {
  const client = tenantClients.get(orgSlug);
  if (client) {
    void client.$disconnect();
    tenantClients.delete(orgSlug);
  }
}

export type { TenantClient };
