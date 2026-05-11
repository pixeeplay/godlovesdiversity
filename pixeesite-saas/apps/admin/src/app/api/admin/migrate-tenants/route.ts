import { NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';
import { execSync } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Push le schéma tenant.prisma sur toutes les DB tenants existantes.
 * Nécessaire après ajout de modèles (Task, ForumThread, etc.).
 */
export async function POST() {
  try { await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const orgs = await platformDb.org.findMany({
    where: { tenantDbReady: true, tenantDbName: { not: null } },
    select: { slug: true, tenantDbName: true },
  });

  const results: any[] = [];
  const platformUrl = process.env.PLATFORM_DATABASE_URL!;

  for (const org of orgs) {
    try {
      const url = new URL(platformUrl);
      url.pathname = `/${org.tenantDbName}`;
      const tenantUrl = url.toString();

      // Run prisma db push for this tenant DB
      const schemaPath = path.join(process.cwd(), '..', '..', 'packages', 'database', 'prisma', 'tenant.prisma');
      const schemaPath2 = '/app/packages/database/prisma/tenant.prisma';

      const schema = require('fs').existsSync(schemaPath2) ? schemaPath2 : schemaPath;

      execSync(`pnpm exec prisma db push --schema "${schema}" --skip-generate --accept-data-loss`, {
        env: { ...process.env, TENANT_DATABASE_URL: tenantUrl },
        stdio: 'pipe',
        timeout: 30000,
      });
      results.push({ slug: org.slug, status: 'ok' });
    } catch (e: any) {
      results.push({ slug: org.slug, status: 'fail', error: e.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({ migrated: results.filter((r) => r.status === 'ok').length, total: orgs.length, results });
}

export async function GET() {
  return POST();
}
