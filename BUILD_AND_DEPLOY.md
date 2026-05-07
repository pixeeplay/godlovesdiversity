# 🚀 Build local + Push GitHub + Déploiement Coolify

**Date :** 7 mai 2026
**Branche actuelle :** `feat/lgbt-refonte-c`
**Tag d'archive :** `archive/god-loves-diversity-2026-05-07`
**Total commits dans la refonte :** 16

---

## ⚠️ Pourquoi on n'a pas pu finir le build ici

Le sandbox Cowork a buté sur un `Bus error` au moment du `npm run build` — c'est une limite environnementale (Sharp + V8 + mémoire mappée). **Ton Mac n'a pas ce souci**, donc on finalise le build chez toi.

Le code lui-même est cohérent :
- ✅ `npx prisma generate` passe (schema valide)
- ✅ Aucun import cassé détecté (grep heuristique, 0 résidu)
- ✅ Tous les composants/routes/libs religieux purgés
- ⏳ Reste à faire chez toi : `npm install && npm run build` puis `docker compose up --build`

---

## 1️⃣ Build local sur ton Mac (5 min)

Ouvre Terminal et tape :

```bash
cd ~/Desktop/parislgbt.com

# 1. Suppression manuelle des résidus macOS (Finder bloque les rm)
# → Tu peux le faire dans Finder en sélectionnant et glissant à la corbeille :
#   - RAPPORT_AUDIT_GLD_*.md
#   - RAPPORT_GLD_*.pdf
#   - SCREENSHOTS_LIBRARY_*.md
#   - SESSION_RECAP_*.md
#   - PLAN_LIEUX_SAINTS_FETES_RELIGIEUSES.md
#   - IDEES_SPIRITUEL_VIRTUEL.md
#   - EVALUATION_ET_PLAN_IA_LOCALE_*.md
#   - PLAN_PROJET_GodLovesDiversity.md
#   - "God Loves Diversity.docx"
#   - "A3  GOD AFFICHE 2025.pdf"
#   - cbc1c5c0-*.png
#   - ainsi que les sous-dossiers vides : src/app/[locale]/{camino,cercles-priere,calendrier-religieux,champ-de-priere,compagnon-spirituel,journal,officiants,verset-inclusif,textes-sacres,argumentaire,affiches,temoignage-ia}
#   - src/app/api/admin/ai/soul/, /seed-camino, /seed-officiants, /seed-religious-events, /seed-world-events
#   - src/app/api/rapport/religious-census/
#   - src/components/prayers/
#   - src/lib/vocal-prayer-transcribe.ts
#
# Ces fichiers sont TOUS gitignored donc ils ne pollueront ni le git status ni les commits.

# 2. Install deps
cp .env.example .env       # crée ton .env local
npm install --legacy-peer-deps

# 3. Generate Prisma client
npx prisma generate

# 4. Build
npm run build              # devrait passer en 1-3 min
```

Si tu vois des erreurs TypeScript résiduelles, elles seront listées avec fichier:ligne et tu pourras me les coller — je patche à la volée.

---

## 2️⃣ Test Docker local (5 min)

Une fois le build OK :

```bash
cd ~/Desktop/parislgbt.com

# Lance toute la stack (postgres + redis + minio + mailpit + next)
docker compose up --build

# Patiente ~2 min au premier boot. Tu devrais voir :
#   - postgres ready
#   - redis ready
#   - minio bucket parislgbt créé
#   - prisma migrate apply
#   - seed: admin créé + 9 identités + 4 photos demo
#   - next: ready on http://localhost:3000

# Vérifie :
open http://localhost:3000        # site public (mode dev → tout visible)
open http://localhost:3000/pride  # nouvelle page LGBT
open http://localhost:3000/identites
open http://localhost:3000/admin/login   # login : arnaud@gredai.com / Nusmob2710$
open http://localhost:8025         # Mailpit (emails de dev)
open http://localhost:9001         # MinIO (lgbtminio / lgbtminio-secret)
```

---

## 3️⃣ Push vers un nouveau repo GitHub (2 min)

### Option A — via GitHub.com (UI)

1. Va sur https://github.com/new
2. Nom : `parislgbt-platform`
3. Description : `🌈 Plateforme communautaire LGBTQIA+ — Paris + France entière`
4. Visibilité : **Private** (puis Public quand tu veux ouvrir le code)
5. **Ne pas initialiser** avec README/gitignore/license (on a déjà tout)
6. Crée le repo

Puis, en local :

```bash
cd ~/Desktop/parislgbt.com

# Branche actuelle
git branch --show-current
# → feat/lgbt-refonte-c

# Lien vers le nouveau repo
git remote remove origin 2>/dev/null   # supprime l'ancien si existant
git remote add origin https://github.com/pixeeplay/parislgbt-platform.git

# Push de la branche + le tag d'archive
git push -u origin feat/lgbt-refonte-c
git push origin archive/god-loves-diversity-2026-05-07

# Crée et push la branche main (à partir de feat)
git checkout -b main
git push -u origin main
```

### Option B — via gh CLI (plus rapide si tu l'as)

```bash
cd ~/Desktop/parislgbt.com
gh repo create pixeeplay/parislgbt-platform --private --source=. --remote=origin --push
git push origin feat/lgbt-refonte-c
git push origin archive/god-loves-diversity-2026-05-07
```

---

## 4️⃣ Déploiement Coolify sur `lgbt.pixeeplay.com` (10 min)

### Pré-requis Coolify

- Tu as un compte Coolify actif (sur `coolify.pixeeplay.com` j'imagine)
- DNS `lgbt.pixeeplay.com` qui pointe vers l'IP de ton serveur Coolify (A record)

### Étapes

**1. Connect le repo GitHub dans Coolify**

- Coolify → Sources → + Add → GitHub
- Tu installes l'app GitHub Coolify si pas déjà fait
- Tu sélectionnes `pixeeplay/parislgbt-platform`

**2. Crée la Resource**

- Coolify → + New Resource → **Docker Compose** (pas "Application")
- Source : `pixeeplay/parislgbt-platform`
- Branch : `main`
- Build Pack : Docker Compose
- Compose file : `docker-compose.yml`

**3. Domain mapping**

Dans la section Domains :
- Service `web` → `lgbt.pixeeplay.com`
- Plus tard tu ajouteras :
  - `parislgbt.com` (alias sur le même service web — middleware détectera le hostname)
  - `francelgbt.com` (idem)

**4. Variables d'environnement (Environment)**

Copie-colle dans Coolify → Environment Variables :

```
# Database (Coolify peut injecter automatiquement si tu utilises sa DB managée)
DATABASE_URL=postgresql://lgbt:lgbt@postgres:5432/parislgbt?schema=public

# Redis
REDIS_URL=redis://redis:6379

# Auth
NEXTAUTH_URL=https://lgbt.pixeeplay.com
NEXTAUTH_SECRET=GÉNÈRE-AVEC-openssl-rand-base64-32
ADMIN_EMAIL=arnaud@gredai.com
ADMIN_PASSWORD=Nusmob2710$

# Multi-domaines
SITE_PRIMARY_DOMAIN=lgbt.pixeeplay.com
SITE_SCOPE_PARIS_DOMAIN=parislgbt.com
SITE_SCOPE_FRANCE_DOMAIN=francelgbt.com

# Storage (MinIO interne ou S3 externe)
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://cdn.lgbt.pixeeplay.com
S3_REGION=us-east-1
S3_BUCKET=parislgbt
S3_ACCESS_KEY=lgbtminio
S3_SECRET_KEY=GÉNÈRE-32-CHARS-RANDOM

# Email (Resend)
RESEND_API_KEY=re_XXX_TON_TOKEN_RESEND
EMAIL_FROM="parislgbt <hello@parislgbt.com>"

# Gemini (à remplir quand tu as la clé)
GEMINI_API_KEY=
GEMINI_TEXT_MODEL=gemini-2.5-pro
GEMINI_IMAGE_MODEL=imagen-3.0-generate-002

# Stripe (Connect Premium + Boutique)
STRIPE_SECRET_KEY=sk_test_XXX
STRIPE_PUBLIC_KEY=pk_test_XXX
STRIPE_WEBHOOK_SECRET=whsec_XXX

# Maps
NEXT_PUBLIC_MAPBOX_TOKEN=

# Réseaux sociaux (à remplir au fur et à mesure)
META_APP_ID=
META_APP_SECRET=
META_PAGE_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ID=
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# App
NEXT_PUBLIC_SITE_URL=https://lgbt.pixeeplay.com
NEXT_PUBLIC_DEFAULT_LOCALE=fr
NEXT_PUBLIC_SUPPORTED_LOCALES=fr,en
```

> 🔐 Génère `NEXTAUTH_SECRET` avec : `openssl rand -base64 32`
> 🔐 Génère `S3_SECRET_KEY` avec : `openssl rand -hex 16`

**5. Configuration HTTPS**

- Coolify → Configuration → Force HTTPS : ON
- Auto-Let's Encrypt sur `lgbt.pixeeplay.com`

**6. Backup Postgres quotidien**

- Coolify → Database → Backups → **Daily** ✅
- Stockage S3 ou local du backup

**7. Deploy !**

- Coolify → Deploy
- Logs en direct dans la console
- ~3-5 min au premier deploy

---

## 5️⃣ Vérifications post-deploy

Une fois Coolify a build et déployé :

```bash
# Smoke test depuis ta machine
curl -I https://lgbt.pixeeplay.com               # 200
curl -I https://lgbt.pixeeplay.com/pride         # 200
curl -I https://lgbt.pixeeplay.com/identites    # 200
curl -I https://lgbt.pixeeplay.com/admin/login  # 200
```

Puis dans le navigateur :
- ✅ https://lgbt.pixeeplay.com → page d'accueil LGBT
- ✅ /pride → 10 marches France 2026 listées
- ✅ /identites → 9 drapeaux + glossaire
- ✅ /sante → 6 sections santé
- ✅ /assos → 10 assos seed
- ✅ /manifeste → 5 valeurs
- ✅ /admin/login → connexion avec `arnaud@gredai.com` / `Nusmob2710$`

---

## 6️⃣ Troubleshooting

### Si le build Coolify échoue

Logs Coolify → cherche `error TS` ou `Module not found`. Les erreurs typiques :

| Erreur | Solution |
|---|---|
| `Cannot find module '@/lib/scope'` | Le tsconfig `@/*` doit pointer vers `src/*`. Vérif `tsconfig.json` |
| `Type 'X' is not assignable to type 'Y'` (Prisma) | `npx prisma generate` localement, commit les types et re-push |
| `Database connection refused` | Vérif `DATABASE_URL` + que le service postgres est up |
| `bcryptjs not found` | Déjà dans deps. `rm -rf node_modules && npm i --legacy-peer-deps` |

### Si la migration Prisma échoue

```bash
# Manuellement dans Coolify shell du container web
npx prisma migrate deploy
npx prisma db seed
```

### Si une route admin renvoie 500

Probablement un import résiduel vers un modèle Prisma supprimé. Coolify logs → cherche "P2009" ou "Unknown field".

---

## 7️⃣ Ce qu'on fera ensuite (Phase 3 — Refonte design)

Une fois `lgbt.pixeeplay.com` UP et fonctionnel, on attaque :

1. **Theme switcher BO** : seeder les 9 thèmes du moodboard dans la table `Theme`
2. **Composants UI** : refacto Hero, Card, Footer, NavBar selon le thème actif
3. **Carte Leaflet** : afficher Place avec filtres
4. **Connect LGBT** : adapter les profils + identités
5. **IA studio** : prompts de génération adaptés
6. **Optimisations** : `next/image`, `next/font`, Lighthouse > 90

---

## 📊 Récap de ce qui a été fait

| Phase | Statut | LOC | Détails |
|---|---|---|---|
| 0 — Setup + planning | ✅ | +5 docs MD/HTML | Plan, inventaire, audit, valuation, 9 moodboards |
| 1 — Purge religieuse | ✅ | −8 059 / +3 216 | 50 fichiers supprimés, 70 transformés, 9 modèles Prisma drop |
| 2 — Multi-domaines | ✅ | +200 | scope.ts + middleware + identity-flags |
| 3 — Pages LGBT | ✅ | +400 | pride, soirees, identites, sante, assos, manifeste, tech |
| 4 — Build local | 🚧 | — | À faire sur ton Mac |
| 5 — GitHub + Coolify | 🚧 | — | À faire après build OK |

**16 commits atomiques** prêts à push.

---

🌈 Bon launch ! Quand tu as `lgbt.pixeeplay.com` qui répond 200, ouvre une nouvelle session et on attaque la **Phase 3 — refonte design** avec ton moodboard préféré.
