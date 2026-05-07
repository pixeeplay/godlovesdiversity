# 🌈 parislgbt + francelgbt — Plateforme LGBTQIA+ communautaire

> Plateforme indépendante, open source, sans publicité.
> **parislgbt.com** (focus Paris) + **francelgbt.com** (toute la France) = **un seul codebase, deux domaines**.
> Staging : `lgbt.pixeeplay.com`

Stack : **Next.js 14 · PostgreSQL+PostGIS · Redis · MinIO · Prisma 5 · NextAuth · Gemini · BullMQ · Resend · Stripe · Tailwind**

---

## 🚀 Démarrage local (5 min)

### Prérequis
- Docker Desktop (macOS/Windows) ou Docker Engine + Compose (Linux)
- Node.js 20+ et npm (uniquement pour le mode dev hot-reload)

### Option A — Tout dans Docker (simple)

```bash
cp .env.example .env          # adapte si besoin
docker compose up --build
```

Au premier boot :
- Postgres, Redis, MinIO, Mailpit démarrent
- Le bucket MinIO `parislgbt` est créé
- Les migrations Prisma sont appliquées
- L'admin par défaut est créé via le seed

Ouvre :

| URL                          | Description |
|------------------------------|-------------|
| http://localhost:3000        | Site public (auto-detect Paris vs France via header) |
| http://localhost:3000/admin  | Back-office |
| http://localhost:9001        | Console MinIO (lgbtminio / lgbtminio-secret) |
| http://localhost:8025        | Mailpit (boîte mail de dev) |

**Identifiants admin par défaut** (à changer immédiatement en prod) :
- Email : `arnaud@gredai.com`
- Mot de passe : défini dans `.env` (`ADMIN_PASSWORD`)

### Option B — Front en hot-reload local + services Docker

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # DB + Redis + MinIO + Mailpit
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

---

## 🌍 Multi-domaines

Une seule appli Next.js qui sert deux sites :

```
Hostname                    →  SITE_SCOPE  →  Comportement
parislgbt.com               →  paris       →  Filtre auto sur city='Paris'
francelgbt.com              →  france      →  Toute la France visible
lgbt.pixeeplay.com          →  staging     →  Bascule manuelle via switcher
localhost:3000              →  dev         →  Tout visible
```

Voir `src/middleware.ts` (injection du header `x-site-scope`) et `src/lib/scope.ts` (helpers serveur).

---

## 🗂️ Arborescence

```
.
├── docker-compose.yml          # stack complète (prod-like)
├── docker-compose.dev.yml      # uniquement les services
├── Dockerfile                  # build Next.js standalone
├── .env.example                # variables d'env documentées
├── prisma/
│   ├── schema.prisma           # models : User, Place, Event, Identity, Connect*, ...
│   └── seed.ts                 # admin + 9 identités + lieux + événements
├── src/
│   ├── middleware.ts           # auth + scope detection
│   ├── app/
│   │   ├── [locale]/           # site public (FR / EN — ES + PT en V2)
│   │   │   ├── pride/          # agenda Pride 365
│   │   │   ├── soirees/        # nightlife
│   │   │   ├── lieux/          # carte interactive
│   │   │   ├── identites/      # glossaire identités + drapeaux
│   │   │   ├── sante/          # PrEP, dépistage, ressources
│   │   │   ├── assos/          # annuaire associations
│   │   │   ├── manifeste/      # 5 valeurs
│   │   │   ├── tech/           # open source / contribuer
│   │   │   ├── connect/        # rencontres LGBT (Tinder-like)
│   │   │   └── ...
│   │   ├── admin/              # back-office complet (~100 sous-routes)
│   │   └── api/                # ~250 routes
│   ├── components/
│   ├── lib/                    # prisma, auth, storage, gemini, scope, identity-flags…
│   ├── i18n/                   # routing & messages next-intl
│   └── messages/               # FR / EN / ES / PT
└── public/
```

---

## 🌈 Identités & drapeaux

Le projet maintient un référentiel **LGBTQIA+** des identités et orientations, avec drapeaux SVG inline (`src/lib/identity-flags.ts`) :

- 🏳️‍🌈 Rainbow (gay), Lesbian, Bi, Trans, Non-binary, Queer (Progress flag)
- Ace, Pan, Intersex
- Nouveaux drapeaux ajoutables via `/admin/identities`

---

## 🛡️ Modération

- Toute photo uploadée est en **`PENDING`**
- L'admin reçoit un email automatique
- Validation manuelle dans `/admin/moderation`
- Préfiltrage IA Gemini Vision activable
- Tolérance zéro pour la haine, le racisme, la LGBTphobie internalisée, la transphobie, la sérophobie

---

## 🤖 IA Gemini (LGBT-friendly)

Studio dans `/admin/ai` :
- Génération de **textes** (légendes, articles, posts, témoignages anonymisés)
- Génération d'**images** (prêt pour Imagen)
- Prompts système configurés pour ton fun, sex-positif sans être cru, militant inclusif, écriture inclusive

`GEMINI_API_KEY=...` dans `.env`. Sans clé, les boutons restent fonctionnels mais retournent un message stub.

---

## 🎨 9 thèmes visuels (sélectionnables en BO)

Dans `/admin/themes`, switche entre :
1. Néon Nuit — Berlin / Berghain
2. Pastel Pop — inclusif day-time
3. Hybride Pride — editorial militant
4. Y2K Queer — chrome 2000s
5. Brutalist Pride — N&B + drapeau pride
6. Drag Glam — or & paillettes
7. Tropical Sunset — Lisbon / Miami / pride été
8. Cyber Trans — vaporwave + drapeau trans
9. Cabaret Belle Époque — Moulin Rouge queer

Voir `MOODBOARDS_LGBT.html` (commit dans le repo) pour les aperçus.

---

## 📅 Calendrier social

Dans `/admin/calendar`, planifie un post unifié vers Instagram, Facebook, X, LinkedIn, TikTok.
Le worker BullMQ (à déployer en V1.5) consommera la file `social-publish` pour publier au bon moment.

Variables d'env à renseigner pour activer chaque canal :
- Meta : `META_APP_ID`, `META_APP_SECRET`, `INSTAGRAM_BUSINESS_ID`
- X : `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
- LinkedIn : `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- TikTok : `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`

---

## 📬 Newsletter

- Formulaire d'inscription avec **double opt-in RGPD**
- Confirmation par email
- Désinscription en 1 clic (token dédié)
- Éditeur HTML simple dans `/admin/newsletter` + bouton **"brouillon par IA"**
- Notification automatique de l'admin à chaque nouvelle inscription
- Segments par scope (Paris / France) + identités déclarées

En dev les emails sont visibles dans Mailpit (http://localhost:8025).
En prod, ajouter `RESEND_API_KEY=...` pour l'envoi via Resend.

---

## 💞 Connect — rencontres LGBT (Tinder-like)

Module communautaire complet :
- Profils avec identité + orientations + scope ville
- Swipe / matches / messages
- Posts communautaires (mur)
- **Premium Stripe** (super likes, voir qui m'a swipé, mode incognito)
- Modération renforcée + signalements + blocages

Configuration : voir `STRIPE_*` dans `.env.example`.

---

## 📱 App mobile (V2)

Endpoint dédié : `POST /api/mobile/upload`
Header : `X-Device-Token: <token>`

L'app Expo sera ajoutée dans un dossier `apps/mobile/` (V2). Elle réutilise 100 % de cette API.

---

## 🚢 Déploiement Coolify

1. Push ce repo sur GitHub :
   ```bash
   git init && git add . && git commit -m "feat: parislgbt platform initial commit"
   git branch -M main
   git remote add origin git@github.com:pixeeplay/parislgbt-platform.git
   git push -u origin main
   ```

2. Dans Coolify → **+ New Resource → Docker Compose**
   - Source : ton repo GitHub
   - Branch : `main`
   - Compose file : `docker-compose.yml`
   - Domaines :
     - `web` → `lgbt.pixeeplay.com` (staging)
     - Plus tard : `parislgbt.com` + `francelgbt.com` (auto-detection middleware)

3. Variables d'env à définir dans Coolify (copier depuis `.env.example`)

4. **Deploy**. Coolify build le Dockerfile, applique les migrations Prisma au boot, et expose le service.

5. Backup Postgres : active **Coolify → Database → Backups → Daily**

---

## 📦 Roadmap par phases

Voir `PLAN_ACTION_LGBT_2026.md` et `INVENTAIRE_ET_MATRICE_DECISION.md` :

- **Phase 1** ✅ Purge religieuse + renaming + i18n + Prisma + libs (terminée)
- **Phase 2** ✅ Multi-domaines middleware + scope.ts + identity-flags (terminée)
- **Phase 3** 🚧 Refonte design (moodboard sélectionné en BO) — en cours
- **Phase 4** ⏳ Adaptation features (carte Leaflet, Connect LGBT, IA prompts avancés, social hashtags)
- **Phase 5** ⏳ Docker rebuild + test local
- **Phase 6** ⏳ Push GitHub + déploiement Coolify
- **Phase 7** ⏳ QA / SEO / a11y
- **Phase 8** ⏳ Documentation finale

---

## 🤝 Conventions

- TypeScript strict
- Tailwind utility-first (pas de CSS modules)
- Server Components par défaut, `'use client'` seulement quand nécessaire
- Toutes les actions admin journalisées dans `AuditLog`
- Écriture inclusive raisonnée (point médian autorisé)
- Tolérance zéro pour la haine

---

## 📞 Support

Email admin : `arnaud@gredai.com`
Hashtags : `#parislgbt #francelgbt #pride2026 #queerparis #queerfrance`

---

## 📊 Origine

Refonte LGBT du projet **God Loves Diversity** (`pixeeplay/godlovesdiversity@b421449` du 7 mai 2026).

Voir `AUDIT_RELIGIEUX_PHASE1.md` pour le détail de la migration (-50 fichiers, +13 commits atomiques, 0 référence religieuse résiduelle).

Tag d'archive disponible : `archive/god-loves-diversity-2026-05-07`.
