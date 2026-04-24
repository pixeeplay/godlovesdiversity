#!/bin/sh
set -e

echo "▶ Applying Prisma migrations…"
npx --yes prisma migrate deploy || npx --yes prisma db push --accept-data-loss

echo "▶ Seeding database (admin + démo)…"
npx --yes prisma db seed || true

echo "▶ Starting Next.js…"
exec node server.js
