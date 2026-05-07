# Déploiement 2 sites sur Coolify — même repo GitHub

## Architecture

Un seul repo GitHub `pixeeplay/parislgbt.com` → **2 applications Coolify** distinctes.

| Site | Domaine | Scope | Couleur |
|------|---------|-------|---------|
| Paris LGBT | `parislgbt.com` | `paris` | Fuchsia `#FF2BB1` |
| LGBT France | `lgbtfrance.fr` | `france` | Violet `#6D28D9` |

Le middleware Next.js détecte automatiquement le domaine et adapte le contenu (scope, hero text, logo fallback, menu, filtres Prisma).

---

## 🏗️ Étape 1 — Déploiement `parislgbt.com`

### Dans Coolify : Nouvelle Application
- Source : GitHub → `pixeeplay/parislgbt.com`
- Branch : `feat/lgbt-refonte-c` (ou `main` quand mergé)
- Build Pack : **Docker Compose** → fichier `docker-compose.yml`
- Domain : `parislgbt.com`

### Variables d'environnement Coolify (parislgbt.com)
```
# Auth
NEXTAUTH_URL=https://parislgbt.com
NEXTAUTH_SECRET=<génère un secret : openssl rand -hex 32>
ADMIN_EMAIL=arnaud@gredai.com

# Domaines multi-site
SITE_PRIMARY_DOMAIN=parislgbt.com
NEXT_PUBLIC_PARIS_URL=https://parislgbt.com
NEXT_PUBLIC_FRANCE_URL=https://lgbtfrance.fr

# Base de données (partagée avec lgbtfrance.fr)
DATABASE_URL=postgresql://lgbt:YOUR_PASS@postgres:5432/parislgbt?schema=public

# Redis (partagé)
REDIS_URL=redis://redis:6379

# Storage MinIO
S3_ENDPOINT=https://minio.ton-coolify.com
S3_PUBLIC_ENDPOINT=https://minio.ton-coolify.com
S3_ACCESS_KEY=lgbtminio
S3_SECRET_KEY=YOUR_MINIO_SECRET
S3_BUCKET=parislgbt
S3_REGION=us-east-1

# IA
GEMINI_API_KEY=YOUR_GEMINI_KEY

# Email
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=YOUR_RESEND_KEY
EMAIL_FROM=noreply@parislgbt.com

# Paiements (optionnel)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## 🏗️ Étape 2 — Déploiement `lgbtfrance.fr`

### Dans Coolify : Deuxième Application (même repo)
- Source : GitHub → **même repo** `pixeeplay/parislgbt.com`
- Branch : **même branche**
- Build Pack : **Docker Compose** → même `docker-compose.yml`
- Domain : `lgbtfrance.fr`

> ⚠️ Coolify va créer un **deuxième stack Docker** pour cette app. Donne-lui un nom différent (ex: `lgbtfrance`) pour éviter les conflits de noms de services.

### Variables d'environnement Coolify (lgbtfrance.fr) — différences
```
# Les 3 clés qui changent :
NEXTAUTH_URL=https://lgbtfrance.fr
SITE_PRIMARY_DOMAIN=lgbtfrance.fr
EMAIL_FROM=noreply@lgbtfrance.fr

# Même DB, même Redis (base de données partagée)
DATABASE_URL=postgresql://lgbt:YOUR_PASS@postgres:5432/parislgbt?schema=public
REDIS_URL=redis://redis:6379

# Toutes les autres variables identiques à parislgbt.com
```

---

## 🔄 Base de données partagée vs séparée

### Option A — DB partagée (recommandé)
- Un seul PostgreSQL, deux apps pointent dessus
- Le scope filtre automatiquement les données (`scopedWhere()`)
- Un seul backup à gérer
- **Avantage** : les lieux/événements nationaux apparaissent sur lgbtfrance.fr, les parisiens sur parislgbt.com

### Option B — DBs séparées
- Deux PostgreSQL indépendants
- Données complètement isolées
- **À faire** : changer `DATABASE_URL` de lgbtfrance.fr pour pointer vers un autre PostgreSQL

---

## 🐳 Dockerfile — Point clé

Le `Dockerfile` utilise `output: 'standalone'` (Next.js). Les variables d'env sont lues au **runtime** (pas au build), donc le même Docker image peut servir les deux sites.

```
# Un seul build Docker image → deux conteneurs avec des env vars différentes ✓
```

---

## ✅ Checklist post-déploiement

- [ ] DNS `parislgbt.com` → IP Coolify
- [ ] DNS `lgbtfrance.fr` → IP Coolify
- [ ] Certificats SSL Let's Encrypt (auto Coolify/Traefik)
- [ ] Premier lancement : Prisma push DB (auto via CMD)
- [ ] Créer le premier admin : `/admin/login` → seeder ou via psql
- [ ] Uploader logo Paris dans Admin → Paramètres → `paris.site.logoUrl`
- [ ] Uploader logo France dans Admin → Paramètres → `france.site.logoUrl`
- [ ] Tester `https://parislgbt.com` → scope badge = "paris"
- [ ] Tester `https://lgbtfrance.fr` → scope badge = "france"
