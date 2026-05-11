#!/bin/bash
set -e
TOKEN="${COOLIFY_TOKEN:-12|8y8nKwV0lQY6U2V3WmTOfN0ccLnNkStKk2rV7jPzf6756939}"
URL="${COOLIFY_URL:-http://51.75.31.123:8000}"
ADMIN="ocskk8wsg0c4ogo484o04koo"
RENDER="xg4ocsocgc0gks800cwg80ko"

PG='postgres://pixeesite:a9a04446e0114292574c426900a7951d@so40osokwcc0gs4c04koccwk:5432/pixeesite_platform'
PGT='postgres://pixeesite:a9a04446e0114292574c426900a7951d@so40osokwcc0gs4c04koccwk:5432/{dbName}'
PGA='postgres://pixeesite:a9a04446e0114292574c426900a7951d@so40osokwcc0gs4c04koccwk:5432/postgres'
RD='redis://default:r4OmhV7akneePtXVxjTHSwOYvADqX8ig5FszS4a46KQKzAU1xwpdXccB0BTldY7M@ws4wo84swcwwko0wsscc8040:6379/0'
SECRET='VCw9erXHmPEsMvQ6SzajaEiemxeaP6Kh5fApLBN4_pixeesite_2026'
CRON='7036057bc8ac471a371df05cc9590fcb4f46fc9e6f7087a9a67ed249a54c4ceb'

addvar() {
  local UUID=$1; local KEY=$2; local VALUE=$3
  local RESP
  RESP=$(curl -s -X POST "$URL/api/v1/applications/$UUID/envs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$KEY\",\"value\":\"$VALUE\"}")
  echo "  $KEY → $RESP"
}

echo "=== Admin envs ==="
addvar "$ADMIN" PLATFORM_DATABASE_URL "$PG"
addvar "$ADMIN" TENANT_DATABASE_URL_TEMPLATE "$PGT"
addvar "$ADMIN" POSTGRES_ADMIN_URL "$PGA"
addvar "$ADMIN" REDIS_URL "$RD"
addvar "$ADMIN" NEXTAUTH_SECRET "$SECRET"
addvar "$ADMIN" CRON_TOKEN "$CRON"
addvar "$ADMIN" NEXTAUTH_URL "http://ocskk8wsg0c4ogo484o04koo.51.75.31.123.sslip.io"
addvar "$ADMIN" ADMIN_URL "http://ocskk8wsg0c4ogo484o04koo.51.75.31.123.sslip.io"
addvar "$ADMIN" NODE_ENV "production"

echo "=== Render envs ==="
addvar "$RENDER" PLATFORM_DATABASE_URL "$PG"
addvar "$RENDER" TENANT_DATABASE_URL_TEMPLATE "$PGT"
addvar "$RENDER" POSTGRES_ADMIN_URL "$PGA"
addvar "$RENDER" REDIS_URL "$RD"
addvar "$RENDER" NODE_ENV "production"
