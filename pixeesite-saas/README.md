# 🌐 Pixeesite

> **Le site builder AI-first européen.**
> Multi-tenant. RGPD. Self-hostable. BUSL 1.1.

[![License: BUSL 1.1](https://img.shields.io/badge/License-BUSL_1.1-blue.svg)](LICENSE)
[![Status: Pre-alpha](https://img.shields.io/badge/Status-Pre--alpha-orange.svg)]()

---

## 🎯 Vision

Pixeesite est un site builder SaaS qui permet de créer et gérer des
dizaines de sites depuis un seul back-office. **Niveau Webflow / Framer / Wix**,
avec ces différenciateurs :

- 🤖 **AI-first** : Imagen 3 + Gemini + ElevenLabs + fal.ai natifs
- ✨ **100 effets wahoo** déjà packagés (Parallax Stepout, Slider artistique, glitch, neon…)
- 🇪🇺 **EU-hosted, RGPD-strict** : hébergement français/Coolify, isolation forte
- 🔓 **Self-hostable** + **export complet** : anti lock-in promis, repo source ouvert (BUSL → Apache après 4 ans)
- 💶 **Tarif accessible** : 14 € Solo vs 23 $ Webflow Solo

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PIXEESITE PLATFORM                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  apps/admin     app.pixeesite.com  (Next.js 14)          │   │
│  │  → SaaS dashboard, builder, billing, settings             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  apps/render    *.pixeesite.app + custom domains         │   │
│  │  → Rendu multi-tenant des sites publiés                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Caddy reverse-proxy + auto-SSL Let's Encrypt            │   │
│  │  → Custom domain provisioning via API admin              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL                                               │   │
│  │  ├─ pixeesite_platform   (Org, User, Site, Subscription) │   │
│  │  ├─ pixeesite_tenant_arnaud   (DB isolée par tenant)     │   │
│  │  ├─ pixeesite_tenant_marie    (DB isolée par tenant)     │   │
│  │  └─ ... 1 DB par client                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Redis (BullMQ) · MinIO (assets multi-bucket) · Plausible        │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Structure du monorepo

```
pixeesite/
├── apps/
│   ├── admin/                  # Next.js — SaaS dashboard (app.pixeesite.com)
│   ├── render/                 # Next.js — Rendu sites (render.pixeesite.app)
│   └── cli/                    # CLI ops (provisioning tenants)
├── packages/
│   ├── database/               # Prisma schemas (platform + tenant) + factory
│   ├── ai/                     # Wrappers Gemini / Imagen / ElevenLabs / fal.ai
│   ├── blocks/                 # Library partagée des blocs visuels (100 effets)
│   └── ui/                     # Design system du SaaS
├── infrastructure/
│   ├── caddy/Caddyfile         # Reverse-proxy + auto-SSL
│   └── coolify/docker-compose.yml
├── docs/
└── PLAN_SITE_BUILDER_SAAS.md   # Plan stratégique complet (20 sections)
```

## 🚀 Démarrage rapide (dev local)

### Prérequis
- Node.js 20+
- pnpm 9+
- Docker (pour Postgres + Redis + MinIO local)
- Une clé `GEMINI_API_KEY` (gratuit sur [Google AI Studio](https://aistudio.google.com))

### Setup

```bash
# 1. Clone + dépendances
git clone https://github.com/pixeeplay/pixeesite.git
cd pixeesite
pnpm install

# 2. Variables d'environnement
cp .env.example .env
# → édite .env avec ta GEMINI_API_KEY + secrets

# 3. Infra locale (Postgres + Redis + MinIO)
cd infrastructure/coolify
docker compose up -d postgres redis minio

# 4. Provision platform DB
cd ../..
pnpm db:platform:push

# 5. Lance les apps
pnpm dev

# → http://localhost:3000  Admin SaaS
# → http://localhost:3001  Render (avec X-Tenant-Slug header)
```

### Créer ton premier tenant

```bash
# Via CLI (à venir)
pnpm db:tenant:create --slug arnaud-photo --owner arnaud@gredai.com

# Ou via le signup UI sur localhost:3000/signup
```

## 💰 Pricing

| Plan         | Prix    | Sites | Storage | AI / mois | Custom Domain |
| ------------ | ------- | ----- | ------- | --------- | ------------- |
| Free         | 0 €     | 1     | 100 MB  | 50 cr     | ❌            |
| Solo         | 14 €    | 1     | 5 GB    | 500 cr    | ✅ 1          |
| Pro          | 39 €    | 3     | 20 GB   | 2 000 cr  | ✅ ∞          |
| Agency       | 99 €    | 25    | 100 GB  | 10 000 cr | ✅ ∞          |
| Enterprise   | custom  | ∞     | ∞       | ∞         | ✅ + SSO + SLA |

## 🛠 Stack technique

- **Framework** : Next.js 14 App Router · TypeScript · Tailwind
- **DB** : PostgreSQL + Prisma (DB-per-tenant pour isolation forte)
- **Auth** : NextAuth + 2FA TOTP + SSO SAML (Enterprise)
- **Storage** : MinIO multi-bucket
- **Queue** : BullMQ + Redis
- **Payments** : Stripe Subscriptions + Tax
- **CDN** : Cloudflare devant Caddy
- **AI** : Gemini 3 + Imagen 3 + ElevenLabs + fal.ai Seedance + HeyGen
- **Reverse-proxy** : Caddy avec API admin pour custom domains
- **Hébergement** : Coolify chez Hetzner / Scaleway / OVH (EU)

## 🔐 Sécurité

- DB isolation forte (1 DB physique par tenant)
- 2FA obligatoire pour les owners
- Audit log immuable des actions sensibles
- Rate-limiter par tenant (anti-abuse IA)
- WAF Cloudflare
- Backups chiffrés AES-256 quotidiens
- Hébergement EU + RGPD strict

## 📝 License

**Business Source License 1.1** → conversion automatique en **Apache 2.0**
4 ans après la première publication d'une version.

Tu peux :
- ✅ Self-héberger Pixeesite pour ton usage perso ou interne
- ✅ Modifier le code, le forker, contribuer
- ✅ Utiliser en production pour tes propres sites

Tu ne peux pas :
- ❌ Lancer un SaaS concurrent qui revend Pixeesite à des tiers (avant 4 ans)

Pour une **license commerciale** ou une **partner program** : licensing@pixeesite.com

## 🗺 Roadmap

Voir [`PLAN_SITE_BUILDER_SAAS.md`](./PLAN_SITE_BUILDER_SAAS.md) pour le plan complet en 12 phases sur 4 mois.

### Phase 1 (semaine 1-2) — En cours
- [x] Monorepo pnpm + Turborepo
- [x] Schémas Prisma platform + tenant
- [x] Tenant DB factory + provisioning
- [x] Caddy + Docker Compose
- [ ] Auth NextAuth (signup org)
- [ ] Dashboard admin

### Phase 2 (semaine 3-4)
- [ ] Port du Page Builder + 100 effets depuis le projet GLD
- [ ] Theme system avec CSS vars
- [ ] Marketplace 10 templates seed

## 🤝 Contribuer

Pixeesite est un projet open-core. Les PRs sont les bienvenues sur la
partie open. Voir [CONTRIBUTING.md](./CONTRIBUTING.md) (à venir).

## 📞 Contact

- **Site** : https://pixeesite.com (.com et .app)
- **Email** : hello@pixeesite.com
- **GitHub** : https://github.com/pixeeplay/pixeesite

---

**Made with ❤️ in France** · *Le site builder qui pense pour toi.*
