#!/bin/bash
# Backup quotidien des DB Pixeesite vers S3/MinIO.
# Usage : à mettre en cron Coolify ou systemd.
#
# Variables d'env requises :
#   PLATFORM_DATABASE_URL
#   BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY, BACKUP_S3_SECRET_KEY

set -e
DATE=$(date +%Y%m%d-%H%M%S)
TMP=/tmp/pixeesite-backup-$DATE
mkdir -p $TMP

echo "▸ Dump platform DB"
pg_dump "$PLATFORM_DATABASE_URL" --format=custom --no-owner --no-acl > $TMP/platform-$DATE.dump
gzip $TMP/platform-$DATE.dump

echo "▸ Liste des tenants"
TENANTS=$(psql "$PLATFORM_DATABASE_URL" -t -A -c "SELECT \"tenantDbName\" FROM \"Org\" WHERE \"tenantDbReady\" = true AND \"tenantDbName\" IS NOT NULL")

for db in $TENANTS; do
  echo "▸ Dump tenant $db"
  TENANT_URL="${PLATFORM_DATABASE_URL%/*}/$db"
  pg_dump "$TENANT_URL" --format=custom --no-owner --no-acl > $TMP/tenant-$db-$DATE.dump || echo "✗ Failed: $db"
  gzip $TMP/tenant-$db-$DATE.dump 2>/dev/null || true
done

echo "▸ Upload to S3"
if command -v aws &> /dev/null; then
  AWS_ACCESS_KEY_ID=$BACKUP_S3_ACCESS_KEY \
  AWS_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET_KEY \
  aws --endpoint-url=$BACKUP_S3_ENDPOINT s3 sync $TMP s3://$BACKUP_S3_BUCKET/$DATE/
fi

echo "▸ Cleanup local backups older than 7 days"
find /tmp -name "pixeesite-backup-*" -type d -mtime +7 -exec rm -rf {} +

echo "✓ Backup done : $DATE"
