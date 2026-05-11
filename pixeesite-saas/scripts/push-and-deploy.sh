#!/bin/bash
# One-shot : push GitHub + redeploy Coolify (admin + render).
# Usage : double-clique ou `bash scripts/push-and-deploy.sh`

set -e
cd "$(dirname "$0")/.."

COOLIFY_URL="http://51.75.31.123:8000"
COOLIFY_TOKEN="12|8y8nKwV0lQY6U2V3WmTOfN0ccLnNkStKk2rV7jPzf6756939"
ADMIN_UUID="ocskk8wsg0c4ogo484o04koo"
RENDER_UUID="xg4ocsocgc0gks800cwg80ko"

echo "▸ Git push origin main…"
git push origin main || { echo "❌ Push KO — vérifie tes credentials GitHub"; exit 1; }

echo ""
echo "▸ Trigger Coolify redeploy admin…"
curl -s -X POST "$COOLIFY_URL/api/v1/applications/$ADMIN_UUID/start" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | head -c 200
echo ""

echo ""
echo "▸ Trigger Coolify redeploy render…"
curl -s -X POST "$COOLIFY_URL/api/v1/applications/$RENDER_UUID/start" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | head -c 200
echo ""

echo ""
echo "✓ Deploys déclenchés. Compte ~3-5 min."
echo ""
echo "URLs à tester ensuite :"
echo "  Admin  : http://ocskk8wsg0c4ogo484o04koo.51.75.31.123.sslip.io/dashboard"
echo "  Render : http://xg4ocsocgc0gks800cwg80ko.51.75.31.123.sslip.io"
echo ""
echo "Tail des logs en live :"
echo "  Admin  : $COOLIFY_URL/project/.../application/$ADMIN_UUID/deployments"
echo "  Render : $COOLIFY_URL/project/.../application/$RENDER_UUID/deployments"
