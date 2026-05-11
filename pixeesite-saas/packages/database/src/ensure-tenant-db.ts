/**
 * Provisioning autonome d'une DB tenant — utilise PLATFORM_DATABASE_URL directement
 * (pas besoin de POSTGRES_ADMIN_URL séparé). Crée la DB Postgres si absente puis
 * met à jour Org.tenantDbName + tenantDbReady.
 *
 * Idempotent : safe à rappeler. Utilisé à la fois par /api/admin/init-tenant
 * et par le wizard de création de site pour s'auto-réparer si la DB manque.
 *
 * NB : ce module est dans packages/database/ parce qu'il importe `pg` (qui n'est
 * déclaré que comme dépendance de ce package, pas de apps/admin).
 */
import { Client as PgClient } from 'pg';
import { platformDb } from './platform';

function dbNameFor(orgSlug: string): string {
  return `pixeesite_tenant_${orgSlug.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}`;
}

/**
 * S'assure que la DB tenant existe :
 *   1. Lookup Org.tenantDbName (sinon calcule un nom depuis le slug)
 *   2. Se connecte au serveur Postgres avec PLATFORM_DATABASE_URL et exécute CREATE DATABASE si nécessaire
 *   3. Update Org.tenantDbName + tenantDbReady
 *
 * Retourne { dbName, created, reused } — `created` indique si on a réellement créé la DB ce tour-ci.
 */
export async function ensureTenantDb(orgSlug: string): Promise<{ dbName: string; created: boolean; reused: boolean }> {
  const org = await platformDb.org.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true, tenantDbName: true, tenantDbReady: true },
  });
  if (!org) throw new Error(`Org "${orgSlug}" not found`);

  const dbName = org.tenantDbName || dbNameFor(orgSlug);
  const platformUrl = process.env.PLATFORM_DATABASE_URL;
  if (!platformUrl) throw new Error('PLATFORM_DATABASE_URL missing');

  // Se connecte à postgres système (DB par défaut "postgres") pour faire CREATE DATABASE
  const adminUrl = new URL(platformUrl);
  adminUrl.pathname = '/postgres';

  const client = new PgClient({ connectionString: adminUrl.toString() });
  await client.connect();
  let created = false;
  let reused = false;
  try {
    const { rows } = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (rows.length === 0) {
      // CREATE DATABASE ne supporte pas les paramètres prepared → on quote manuellement
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      created = true;
    } else {
      reused = true;
    }
  } finally {
    await client.end();
  }

  // Met à jour la metadata Org
  if (!org.tenantDbName || !org.tenantDbReady) {
    await platformDb.org.update({
      where: { id: org.id },
      data: { tenantDbName: dbName, tenantDbReady: true },
    });
  }

  return { dbName, created, reused };
}
