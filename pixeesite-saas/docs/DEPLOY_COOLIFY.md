# 🚀 Déploiement Pixeesite sur Coolify

Guide pas-à-pas pour mettre Pixeesite en prod (gld.pixeeplay.com / Coolify).

## 1. Créer le repo GitHub

```bash
cd /Users/arnaudgredai/Desktop/godlovedirect/pixeesite-saas
git init
git add -A
git commit -m "feat: initial Pixeesite scaffold"

# Crée le repo sur github.com/pixeeplay/pixeesite (manuellement)
git remote add origin https://github.com/pixeeplay/pixeesite.git
git branch -M main
git push -u origin main
```

## 2. Acheter les domaines

- `pixeesite.com` (Gandi / OVH ~12 €/an)
- `pixeesite.app` (Google Domains ~12 €/an, mieux pour le wildcard)

## 3. Configuration DNS (Cloudflare recommandé)

```
A     pixeesite.com           → IP serveur Coolify
A     app.pixeesite.com       → IP serveur Coolify
A     pixeesite.app           → IP serveur Coolify
A     render.pixeesite.app    → IP serveur Coolify
*     pixeesite.app           → IP serveur Coolify   (wildcard pour tenants)
```

## 4. Coolify — Services à créer

### 4.1 PostgreSQL 16
- New Resource → Database → PostgreSQL 16
- Name : `pixeesite-postgres`
- Username : `pixeesite`
- Password : `<générer aléatoire>`
- Database : `pixeesite_platform`
- Expose externally : NO (interne uniquement)
- Note : ce Postgres hébergera AUSSI les DB tenants (`pixeesite_tenant_xxx`)

### 4.2 Redis 7
- New Resource → Database → Redis 7
- Name : `pixeesite-redis`

### 4.3 MinIO
- New Resource → Service → MinIO
- Name : `pixeesite-minio`
- Root user : `pixeesite`
- Root password : `<générer>`

### 4.4 Caddy (reverse-proxy)
- New Resource → Service → Custom (Docker Compose)
- Utilise `infrastructure/coolify/docker-compose.yml` du repo
- Ou crée un service Caddy dédié avec le `Caddyfile` mounted

### 4.5 Application "admin" (Pixeesite SaaS dashboard)
- New Resource → Application → Public Repository
- Repository : `https://github.com/pixeeplay/pixeesite.git`
- Branch : `main`
- Build pack : Nixpacks ou Dockerfile
- **Base directory** : `/`
- **Build command** : `pnpm install --frozen-lockfile && pnpm build --filter @pixeesite/admin`
- **Start command** : `pnpm --filter @pixeesite/admin start`
- **Port** : `3000`
- **Domain** : `app.pixeesite.com`

### 4.6 Application "render" (rendering multi-tenant)
- Same repo, séparée
- **Build command** : `pnpm install --frozen-lockfile && pnpm build --filter @pixeesite/render`
- **Start command** : `pnpm --filter @pixeesite/render start`
- **Port** : `3001`
- **Domain** : `*.pixeesite.app` (wildcard) + `render.pixeesite.app`
- **SSL** : Let's Encrypt avec wildcard (nécessite DNS-01 challenge)

## 5. Variables d'environnement Coolify

À configurer dans **chaque** application (admin + render) :

```bash
# Platform DB
PLATFORM_DATABASE_URL=postgres://pixeesite:<password>@pixeesite-postgres:5432/pixeesite_platform

# Tenant DBs (template)
TENANT_DATABASE_URL_TEMPLATE=postgres://pixeesite:<password>@pixeesite-postgres:5432/{dbName}
POSTGRES_ADMIN_URL=postgres://pixeesite:<password>@pixeesite-postgres:5432/postgres

# Redis
REDIS_URL=redis://pixeesite-redis:6379

# Auth
NEXTAUTH_URL=https://app.pixeesite.com
NEXTAUTH_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=<from console.cloud.google.com>
GOOGLE_CLIENT_SECRET=<from console.cloud.google.com>

# MinIO
MINIO_ENDPOINT=pixeesite-minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=pixeesite
MINIO_SECRET_KEY=<root-password>

# AI
GEMINI_API_KEY=<aistudio.google.com>
ELEVENLABS_API_KEY=<elevenlabs.io>
FAL_KEY=<fal.ai dashboard>

# Stripe (mode test puis live)
STRIPE_SECRET_KEY=sk_test_... ou sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# Email
RESEND_API_KEY=re_...

# Caddy
CADDY_ADMIN_URL=http://pixeesite-caddy:2019

# Domains
PLATFORM_DOMAIN=pixeesite.com
RENDER_DOMAIN=pixeesite.app
ADMIN_URL=https://app.pixeesite.com

# Cron
CRON_TOKEN=<openssl rand -hex 32>
```

## 6. Première migration platform DB

Une fois l'app `admin` déployée, exécute via Coolify Terminal :

```bash
# Push le schema platform
pnpm --filter @pixeesite/database db:platform:push

# Seed les 10 templates de la marketplace
pnpm --filter @pixeesite/cli templates:seed
```

## 7. Setup Stripe

### 7.1 Crée 3 prix dans Stripe Dashboard

```
Solo   : 14 €/mois  → STRIPE_PRICE_SOLO=price_xxx
Pro    : 39 €/mois  → STRIPE_PRICE_PRO=price_xxx
Agency : 99 €/mois  → STRIPE_PRICE_AGENCY=price_xxx
```

### 7.2 Setup webhook
- Stripe Dashboard → Developers → Webhooks
- URL : `https://app.pixeesite.com/api/stripe/webhook`
- Events :
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Copy le `whsec_...` dans `STRIPE_WEBHOOK_SECRET`

### 7.3 Setup Stripe Tax
- Activer Stripe Tax dans Settings
- Configurer EU automatique pour TVA

## 8. Setup Google OAuth

- console.cloud.google.com → APIs & Services → Credentials
- Create OAuth 2.0 Client ID
- Authorized redirect URIs :
  - `https://app.pixeesite.com/api/auth/callback/google`
  - `http://localhost:3000/api/auth/callback/google` (dev)

## 9. Caddy wildcard SSL

Pour le wildcard `*.pixeesite.app`, il faut DNS-01 challenge avec un provider DNS API.

### Option A : Cloudflare (recommandé)
```
# Caddyfile
*.pixeesite.app {
  tls {
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }
  reverse_proxy render:3001
}
```

Variable d'env Caddy :
```
CLOUDFLARE_API_TOKEN=<token avec Zone:DNS:Edit sur pixeesite.app>
```

### Option B : OVH
```
*.pixeesite.app {
  tls {
    dns ovh {env.OVH_APPLICATION_KEY} {env.OVH_APPLICATION_SECRET} {env.OVH_CONSUMER_KEY} ovh-eu
  }
  reverse_proxy render:3001
}
```

## 10. Cron jobs (Coolify Scheduled Tasks)

### Verify custom domains DNS toutes les 5 min
```
*/5 * * * *
curl -X POST -H "x-cron-token: $CRON_TOKEN" \
  https://app.pixeesite.com/api/cron/verify-domains
```

### Reset compteurs IA mensuels (le 1er du mois)
```
0 0 1 * *
curl -X POST -H "x-cron-token: $CRON_TOKEN" \
  https://app.pixeesite.com/api/cron/reset-ai-credits
```

## 11. Test end-to-end

1. Va sur `https://app.pixeesite.com/signup`
2. Crée un compte avec org `test-org`
3. La DB tenant `pixeesite_tenant_test_org` doit être provisionnée auto en background
4. → `/dashboard/orgs/test-org/templates`
5. Choisis "Photo Portfolio Chic" → "Utiliser"
6. → `/dashboard/orgs/test-org/sites/{name}` (auto-créé)
7. Click sur "Accueil" → Page Builder Editor
8. Modifie un bloc, ajoute IA image, save
9. → "🚀 Publier"
10. Va sur `https://test-org.pixeesite.app` → ton site est en ligne ✨

## 12. Backups quotidiens

```bash
# Coolify Scheduled Task : 0 3 * * *
pg_dumpall -h pixeesite-postgres -U pixeesite | gzip > /backups/$(date +%F).sql.gz
aws s3 cp /backups/$(date +%F).sql.gz s3://pixeesite-backups/
find /backups -mtime +30 -delete
```

## 13. Monitoring

- **Sentry** : ajoute `SENTRY_DSN` dans les env vars
- **BetterUptime** : status page externe
- **Plausible** (self-host) : analytics par tenant

---

## ⚡ Démarrage rapide (résumé)

```bash
# 1. Créer le repo
cd pixeesite-saas
git init && git add -A && git commit -m "init"
git remote add origin https://github.com/pixeeplay/pixeesite.git
git push -u origin main

# 2. Coolify : 4 services (Postgres, Redis, MinIO, Caddy) + 2 apps (admin, render)
# 3. ENV : copier .env.example values dans Coolify
# 4. DNS : wildcard *.pixeesite.app → IP serveur
# 5. Stripe : 3 prix + webhook
# 6. Test signup sur app.pixeesite.com
```

Time-to-prod : ~2-3h une fois les domaines et le serveur prêts.
