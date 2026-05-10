#!/bin/bash
# Init le repo git pour Pixeesite et le push sur GitHub.
# À exécuter UNE FOIS depuis le dossier pixeesite-saas/

set -e

cd "$(dirname "$0")/.."

if [ -d ".git" ]; then
  echo "⚠ .git existe déjà — skip git init"
else
  echo "▸ git init"
  git init
fi

echo "▸ git config"
git config user.email "arnaud@gredai.com" 2>/dev/null || true
git config user.name "Arnaud" 2>/dev/null || true

echo "▸ git add ."
git add -A

if git diff --cached --quiet; then
  echo "Rien à commiter"
else
  echo "▸ git commit"
  git commit -m "feat: initial Pixeesite scaffold

- Monorepo pnpm + Turborepo (apps/admin + apps/render + apps/cli + 4 packages)
- BUSL 1.1 license avec conversion Apache 2.0 dans 4 ans
- Multi-tenant DB-per-tenant (Postgres + Prisma factory)
- 100 effets wahoo + ParallaxHero + ParallaxSlider depuis GLD
- Theme system 13 CSS vars + 5 presets
- Auth NextAuth (Google + Credentials) + 2FA TOTP
- Signup org avec auto-provisioning DB tenant
- Dashboard avec org switcher + sites CRUD + 4 stats
- Marketplace 10 templates + Use template flow
- Page Builder Editor full drag-drop + 100 effets picker + AI media
- Site detail + Pages CRUD + Publish endpoint
- Stripe billing (Checkout + Portal + 5 webhook events)
- Custom domains UI avec DNS verification + Caddy SSL provisioning
- Team invitations Resend + accept token flow
- 2FA TOTP setup avec QR code otpauth://
- Caddyfile wildcard *.pixeesite.app + on-demand TLS
- docker-compose.yml Coolify (Postgres + Redis + MinIO + Caddy + 2 apps)
- DEPLOY_COOLIFY.md guide complet

Phase 1-5 du plan terminées. Prêt pour beta privée." || echo "(commit existing)"
fi

echo ""
echo "✓ Local OK. Pour pousser sur GitHub :"
echo ""
echo "  1. Crée le repo sur https://github.com/new"
echo "     Name: pixeesite"
echo "     Owner: pixeeplay (ou ton compte)"
echo "     Visibility: Private (avant launch) puis Public"
echo ""
echo "  2. Connecte le remote :"
echo "     git remote add origin https://github.com/pixeeplay/pixeesite.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo ""
echo "  3. Sur Coolify, ajoute le repo comme nouvelle app + suis docs/DEPLOY_COOLIFY.md"
