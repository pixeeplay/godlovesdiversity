# 🌈 God Loves Diversity

Plateforme militante interreligieuse — front public + back-office + API mobile.
Stack : **Next.js 14 · PostgreSQL (PostGIS) · Redis · MinIO · Prisma · NextAuth · Gemini · Tailwind**.

---

## 🚀 Démarrage local (5 minutes)

### Prérequis

- Docker Desktop (macOS/Windows) ou Docker Engine + Compose (Linux)
- Node.js 20+ et npm (uniquement pour le mode dev hot-reload)

### Option A — Tout dans Docker (le plus simple)

```bash
cp .env.example .env          # adapte si besoin
docker compose up --build
```

Au premier boot :
- Postgres, Redis, MinIO, Mailpit démarrent
- Le bucket MinIO `godlovesdiversity` est créé
- Les migrations Prisma sont appliquées
- L'admin par défaut est créé via le seed

Ensuite ouvre :

| URL                          | Description |
|------------------------------|-------------|
| http://localhost:3000        | Site public |
| http://localhost:3000/admin  | Back-office |
| http://localhost:9001        | Console MinIO (gldminio / gldminio-secret) |
| http://localhost:8025        | Mailpit (boîte mail de dev) |

**Identifiants admin par défaut** (à changer immédiatement) :
- Email : `arnaud@gredai.com`
- Mot de passe : `GodLoves2026!`

### Option B — Front en hot-reload local + services Docker

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # DB + Redis + MinIO + Mailpit
npm install
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Le front démarre sur http://localhost:3000 et reflète tes changements à chaque sauvegarde.

---

## 🗂️ Arborescence du projet

```
.
├── docker-compose.yml          # stack complète (prod-like)
├── docker-compose.dev.yml      # uniquement les services (DB/Redis/MinIO/Mail)
├── Dockerfile                  # build du front Next.js
├── .env.example                # variables d'env documentées
├── prisma/
│   ├── schema.prisma           # modèles : User, Photo, Page, Article, Newsletter…
│   └── seed.ts                 # admin + démo
├── src/
│   ├── app/
│   │   ├── [locale]/           # site public (FR / EN / ES / PT)
│   │   ├── admin/              # back-office (login, dashboard, modération…)
│   │   └── api/                # routes API (upload, IA, newsletter, social, mobile)
│   ├── components/             # UI publique + composants admin
│   ├── lib/                    # prisma, auth, storage, gemini, email
│   ├── i18n/                   # routing & messages next-intl
│   └── messages/               # FR / EN / ES / PT JSON
└── public/posters/             # affiches téléchargeables (PDF)
```

---

## 🌍 Internationalisation

Quatre langues pré-câblées : **FR (par défaut), EN, ES, PT**.
Pour ajouter une langue, créer `src/messages/<code>.json` puis ajouter le code dans `src/i18n/routing.ts`.

URLs : `/`, `/en`, `/es`, `/pt` (préfixe ajouté uniquement quand nécessaire).

---

## 🛡️ Modération

- Toute photo uploadée est en **`PENDING`**.
- L'admin reçoit un email automatique (via Mailpit en dev, Resend en prod).
- Validation manuelle dans `/admin/moderation`.
- Préfiltrage IA Gemini Vision : prêt à brancher dans `src/lib/gemini.ts`.

---

## 🤖 IA Gemini

Studio dans `/admin/ai` :
- Génération de **textes** (légendes, articles, posts, témoignages anonymisés)
- Génération d'**images** (prêt pour Imagen)

Ajoute `GEMINI_API_KEY=...` dans `.env`. Sans clé, les boutons restent fonctionnels mais retournent un message stub.

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

En dev les emails sont visibles dans Mailpit (http://localhost:8025).
En prod, ajouter `RESEND_API_KEY=...` pour l'envoi via Resend.

---

## 📱 App mobile (V2)

Endpoint dédié : `POST /api/mobile/upload`
Header : `X-Device-Token: <token>` (à générer dans le BO `Settings → API Keys` — V1.5)

L'app Expo sera ajoutée dans un dossier `apps/mobile/` (V2). Elle réutilise 100 % de cette API.

---

## 🚢 Déploiement Coolify

1. Pousse ce repo sur GitHub :
   ```bash
   git init && git add . && git commit -m "feat: initial GLD platform"
   git branch -M main
   git remote add origin git@github.com:<toi>/<repo>.git
   git push -u origin main
   ```

2. Dans Coolify → **+ New Resource → Docker Compose**
   - Source : ton repo GitHub
   - Branch : `main`
   - Compose file : `docker-compose.yml`
   - Domains :
     - `web` → `godlovesdiversity.com`
     - (optionnel) `minio` → `cdn.godlovesdiversity.com`

3. Variables d'env à définir dans Coolify (copier depuis `.env.example`) :
   - `DATABASE_URL`, `REDIS_URL` → utilisent les services internes
   - `NEXTAUTH_URL=https://godlovesdiversity.com`
   - `NEXTAUTH_SECRET` → `openssl rand -base64 32`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `S3_PUBLIC_ENDPOINT=https://cdn.godlovesdiversity.com`
   - `RESEND_API_KEY`, `GEMINI_API_KEY` → quand tu les as
   - Tokens des réseaux sociaux

4. **Deploy**. Coolify build le Dockerfile, applique les migrations Prisma au boot, et expose le service.

5. Backup Postgres : active **Coolify → Database → Backups → Daily**.

---

## 🧪 Vérifications après boot

- [ ] http://localhost:3000 affiche le hero "GOD ❤️ DIVERSITY"
- [ ] Changer la langue (top-right) fonctionne (FR/EN/ES/PT)
- [ ] http://localhost:3000/galerie montre les 4 photos de démo
- [ ] http://localhost:3000/participer permet d'uploader (la photo apparaît dans `/admin/moderation`)
- [ ] http://localhost:3000/admin/login → connexion avec les identifiants par défaut
- [ ] http://localhost:8025 affiche les emails de notification admin et de double opt-in
- [ ] L'icône MinIO (http://localhost:9001) montre le bucket `godlovesdiversity` avec les uploads

---

## 📦 Ce qui n'est pas inclus en V1 (et pourquoi)

| Fonctionnalité           | Statut V1 | Notes |
|--------------------------|-----------|-------|
| Carte interactive Mapbox | UI prête, à ajouter | Ajouter `NEXT_PUBLIC_MAPBOX_TOKEN` puis composant `<MapWorld />` |
| Workers BullMQ           | API prête, worker non démarré | Microservice à ajouter (`apps/worker`) en V1.5 |
| Publication réelle multi-réseaux | Endpoints à connecter | Intégrer SDK Meta / X / LinkedIn quand tokens fournis |
| Imagen (image gen)       | wiring stub | activer via `GEMINI_API_KEY` |
| App mobile Expo          | V2 | endpoint `/api/mobile/upload` déjà prêt |

---

## 🤝 Conventions

- TypeScript strict
- Tailwind utility-first (pas de CSS modules)
- Server Components par défaut, `'use client'` seulement quand nécessaire
- Toutes les actions admin journalisées dans `AuditLog`

---

## 📞 Support

Email admin : `arnaud@gredai.com`
Hashtag : `#GodLovesDiversity`
