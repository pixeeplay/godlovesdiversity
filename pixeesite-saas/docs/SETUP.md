# 🛠 Setup — Pixeesite

Guide complet pour démarrer le développement local et déployer en prod sur Coolify.

## 1. Prérequis

- **Node.js 20+** (`nvm install 20`)
- **pnpm 9+** (`npm i -g pnpm@9`)
- **Docker + Docker Compose** (Postgres / Redis / MinIO local)
- **Git** + un compte GitHub
- **Clé `GEMINI_API_KEY`** gratuite sur [aistudio.google.com](https://aistudio.google.com)

## 2. Installation

```bash
git clone https://github.com/pixeeplay/pixeesite.git
cd pixeesite

# Install workspaces
pnpm install

# Copy env
cp .env.example .env
```

Édite `.env` :
- `PLATFORM_DATABASE_URL` → laisse `postgresql://pixeesite:changeme@localhost:5432/pixeesite_platform` pour le local
- `TENANT_DATABASE_URL_TEMPLATE` → `postgresql://pixeesite:changeme@localhost:5432/{dbName}`
- `POSTGRES_ADMIN_URL` → `postgresql://postgres:postgres@localhost:5432/postgres`
- `NEXTAUTH_SECRET` → `openssl rand -base64 32`
- `GEMINI_API_KEY` → ta clé
- `NEXTAUTH_URL` → `http://localhost:3000`

## 3. Lancer l'infra locale

```bash
cd infrastructure/coolify
docker compose up -d postgres redis minio
```

Ça démarre :
- Postgres sur `localhost:5432` (user: `pixeesite`, db: `pixeesite_platform`)
- Redis sur `localhost:6379`
- MinIO sur `localhost:9000` (console `:9001`)

## 4. Provision platform DB

```bash
cd ../..  # retour racine
pnpm db:platform:push
```

Ça crée toutes les tables Org / User / Site / Subscription / etc.

## 5. Lancer les apps en dev

```bash
pnpm dev
```

Ouvre :
- **Admin SaaS** : http://localhost:3000
- **Render** : http://localhost:3001 (avec header `X-Tenant-Slug: arnaud-photo` pour tester)

## 6. Créer ton premier tenant

```bash
# Créer la DB tenant + appliquer schema + lier à une org
pnpm --filter @pixeesite/cli tenant:create --slug arnaud-photo --owner arnaud@example.com --plan pro
```

Ou via le signup UI :
1. Va sur http://localhost:3000/signup
2. Crée ton compte + nom de l'organisation `arnaud-photo`
3. Le wizard provisionne la DB tenant en background

## 7. Tester le multi-tenant

### Subdomain locale (avec `/etc/hosts` ou un wildcard DNS)
Ajoute à `/etc/hosts` :
```
127.0.0.1  arnaud-photo.localhost
127.0.0.1  marie-design.localhost
```

Puis ouvre `http://arnaud-photo.localhost:3001` → tu vois le site du tenant arnaud-photo.

### Custom domain (en dev)
Édite `apps/render/middleware.ts` pour forcer un orgSlug en local, ou utilise le header :
```bash
curl -H "X-Tenant-Slug: arnaud-photo" http://localhost:3001
```

## 8. Stripe (optionnel en dev)

Pour tester le billing :
1. Crée un compte Stripe en mode test
2. Récupère ta `STRIPE_SECRET_KEY` (sk_test_...)
3. Crée 3 produits : Solo / Pro / Agency
4. Mets les `price_id` dans `.env`
5. Setup webhook : `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`

## 9. Déploiement Coolify (production)

### A. DNS
- `pixeesite.com` → A record vers IP serveur
- `*.pixeesite.app` → wildcard A record vers IP serveur
- `app.pixeesite.com` → A record vers IP serveur

### B. Coolify resources
1. **Postgres** : créer un service Postgres 16, exposer en interne
2. **Redis** : créer un service Redis 7
3. **MinIO** : créer un service MinIO avec accès console
4. **Caddy** : déployer en utilisant `infrastructure/caddy/Caddyfile` avec wildcard `*.pixeesite.app`
5. **admin** : déployer depuis ce repo, dossier `apps/admin`, port 3000
6. **render** : déployer depuis ce repo, dossier `apps/render`, port 3001

### C. Variables Coolify
Reprends toutes les variables du `.env.example` mais avec les vraies valeurs prod :
- DB URLs avec Postgres interne Coolify
- `MINIO_ENDPOINT` avec service MinIO Coolify
- Stripe live keys
- `NEXTAUTH_URL=https://app.pixeesite.com`

### D. SSL wildcard
Caddy gère auto via Let's Encrypt avec ACME DNS-01 (nécessite un provider DNS API : Cloudflare, OVH, etc).

Configure dans Caddyfile :
```
*.pixeesite.app {
  tls {
    dns cloudflare {env.CF_API_TOKEN}
  }
  reverse_proxy render:3001
}
```

### E. Custom domain client
Quand un client ajoute son domaine `arnaud-photo.com` :
1. UI lui dit : "ajoute un CNAME `arnaud-photo.com → render.pixeesite.app`"
2. Cron toutes les 5 min vérifie le DNS
3. Quand DNS OK : POST `http://caddy:2019/config/apps/http/servers/srv0/routes/...` pour ajouter le domain
4. Caddy provisionne Let's Encrypt cert via HTTP-01
5. UI affiche "✅ HTTPS actif"

## 10. Backups

Cron quotidien sur Coolify :
```bash
# Backup platform + tous les tenants
pg_dumpall -h postgres -U pixeesite | gzip > /backups/pixeesite-$(date +%F).sql.gz
# Push vers S3/B2/Wasabi
aws s3 cp /backups/pixeesite-$(date +%F).sql.gz s3://pixeesite-backups/
```

## 11. Monitoring

- **Sentry** : ajoute `SENTRY_DSN` dans Coolify → tracé des erreurs
- **Plausible** : déploie en service Coolify séparé pour analytics
- **BetterUptime** : status page externe + monitoring santé

## 12. Migrations

```bash
# Quand tu changes platform.prisma
pnpm --filter @pixeesite/database db:platform:migrate

# Pour appliquer un changement tenant.prisma à TOUS les tenants
pnpm --filter @pixeesite/cli tenant:migrate-all
```

## Troubleshooting

### "tenantDbReady is false"
La DB tenant n'a pas fini son provisioning. Relance `pnpm --filter cli tenant:create --slug X` ou vérifie les logs admin.

### Caddy "no certificates"
Vérifie que `CF_API_TOKEN` est bien settée dans l'env Caddy + que le DNS wildcard pointe bien vers le bon IP.

### Erreur "Org not found" sur localhost
Tu n'as pas créé de tenant. Va sur `/signup` ou utilise le CLI.

### MinIO refuse les uploads
Vérifie que `MINIO_ROOT_USER` et `MINIO_ROOT_PASSWORD` matchent `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` dans l'app.
