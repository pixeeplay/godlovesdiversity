#!/bin/bash
# Lancé au startup du container admin.
# 1. Push platform schema (déjà fait dans CMD)
# 2. Push tenant schema sur chaque tenant DB existante
#
# Lit la liste des tenants depuis platform.Org.tenantDbName

set +e  # Don't fail if a tenant has issues
cd /app/packages/database

PLATFORM_URL="${PLATFORM_DATABASE_URL}"
if [ -z "$PLATFORM_URL" ]; then
  echo "[migrate-all-tenants] PLATFORM_DATABASE_URL not set, skipping tenant migrations"
  exit 0
fi

echo "[migrate-all-tenants] Fetching tenant list from platform DB…"

# Extract tenant DB names via psql
TENANTS=$(node -e "
const { PrismaClient } = require('./node_modules/.prisma/platform-client');
const c = new PrismaClient();
c.org.findMany({ where: { tenantDbReady: true, tenantDbName: { not: null } }, select: { slug: true, tenantDbName: true } })
  .then(rows => { rows.forEach(r => console.log(r.tenantDbName + ':' + r.slug)); process.exit(0); })
  .catch(e => { console.error('ERR', e.message); process.exit(1); });
" 2>/dev/null)

if [ -z "$TENANTS" ]; then
  echo "[migrate-all-tenants] No tenants to migrate"
  exit 0
fi

# Build base URL (without database name) for tenant connections
BASE_URL=$(echo "$PLATFORM_URL" | sed 's|/[^/]*$||')

for entry in $TENANTS; do
  DB_NAME="${entry%%:*}"
  SLUG="${entry##*:}"
  TENANT_URL="$BASE_URL/$DB_NAME"
  echo "[migrate-all-tenants] Pushing schema to $SLUG ($DB_NAME)…"
  TENANT_DATABASE_URL="$TENANT_URL" pnpm exec prisma db push \
    --schema prisma/tenant.prisma --skip-generate --accept-data-loss 2>&1 | tail -3
done

echo "[migrate-all-tenants] Done"
exit 0
