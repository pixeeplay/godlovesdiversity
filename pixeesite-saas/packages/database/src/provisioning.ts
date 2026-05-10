/**
 * Tenant DB provisioning.
 *
 * Création / suppression d'une DB Postgres dédiée pour un tenant +
 * application du schéma tenant via prisma db push.
 */
import { Client as PgClient } from 'pg';
import { execSync } from 'child_process';
import path from 'path';
import { platformDb } from './platform';

const POSTGRES_ADMIN_URL = process.env.POSTGRES_ADMIN_URL;

function dbNameFor(orgSlug: string): string {
  return `pixeesite_tenant_${orgSlug.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
}

async function adminQuery<T = unknown>(sql: string): Promise<T[]> {
  if (!POSTGRES_ADMIN_URL) throw new Error('POSTGRES_ADMIN_URL is required for provisioning');
  const client = new PgClient({ connectionString: POSTGRES_ADMIN_URL });
  await client.connect();
  try {
    const r = await client.query(sql);
    return r.rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Provisionne la DB du tenant :
 *   1. CREATE DATABASE pixeesite_tenant_<slug>
 *   2. Applique le schéma tenant.prisma via `prisma db push`
 *   3. Update Org.tenantDbName + tenantDbReady=true
 */
export async function provisionTenantDb(orgSlug: string): Promise<{ dbName: string }> {
  const dbName = dbNameFor(orgSlug);

  // 1. CREATE DATABASE
  await adminQuery(`CREATE DATABASE "${dbName}"`).catch((err: any) => {
    if (!String(err?.message || '').includes('already exists')) throw err;
  });

  // 2. Build l'URL et applique le schéma
  const tenantUrl = (process.env.TENANT_DATABASE_URL_TEMPLATE || '')
    .replace('{orgSlug}', orgSlug)
    .replace('{dbName}', dbName);
  if (!tenantUrl) throw new Error('TENANT_DATABASE_URL_TEMPLATE missing');

  const schemaPath = path.resolve(__dirname, '../prisma/tenant.prisma');
  execSync(`prisma db push --schema "${schemaPath}" --skip-generate --accept-data-loss`, {
    env: { ...process.env, TENANT_DATABASE_URL: tenantUrl },
    stdio: 'inherit',
  });

  // 3. Update Org
  await platformDb.org.update({
    where: { slug: orgSlug },
    data: { tenantDbName: dbName, tenantDbReady: true },
  });

  return { dbName };
}

/**
 * Drop la DB du tenant (à réserver à l'admin platform — irréversible !).
 */
export async function dropTenantDb(orgSlug: string): Promise<void> {
  const dbName = dbNameFor(orgSlug);
  // Force la déconnexion des clients existants
  await adminQuery(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}'`
  ).catch(() => {});
  await adminQuery(`DROP DATABASE IF EXISTS "${dbName}"`);
  await platformDb.org.update({
    where: { slug: orgSlug },
    data: { tenantDbName: null, tenantDbReady: false },
  });
}
