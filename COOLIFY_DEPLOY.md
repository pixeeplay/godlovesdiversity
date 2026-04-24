# 🚀 Déploiement Coolify — God Loves Diversity

Ce guide te permet de déployer en **15 minutes** ton instance Coolify.

---

## Prérequis

- Repo GitHub : https://github.com/pixeeplay/godlovesdiversity (✅ déjà fait)
- Coolify v4+ installé sur un serveur
- Un sous-domaine pointé vers l'IP de ton serveur Coolify (ex: `gld.tondomaine.com`)

---

## Étape 1 — Connecter GitHub à Coolify (1ère fois seulement)

Coolify → **Sources → + Add → GitHub App** → suis l'assistant pour autoriser
le compte `pixeeplay` et installer Coolify dans le repo `godlovesdiversity`.

---

## Étape 2 — Créer la ressource

Coolify → ton projet → **+ New Resource → Public Repository → "Docker Compose Empty"**

> Pourquoi "Public" ? Même si le repo est privé, on passe par GitHub App donc Coolify y accède.
> Si tu n'as pas connecté l'app GitHub, choisis "Private Repository" et colle ton clone URL SSH.

Configure :
- **Repository URL** : `https://github.com/pixeeplay/godlovesdiversity`
- **Branch** : `main`
- **Build Pack** : `Docker Compose`
- **Docker Compose Location** : `docker-compose.yml`
- **Domain** : `gld.tondomaine.com` (à adapter)

---

## Étape 3 — Variables d'environnement

Dans **Environment Variables**, colle ce bloc d'un coup (Coolify a un champ
"Bulk edit" pour ça) :

```env
# ─── Database ───
DATABASE_URL=postgresql://gld:gld@postgres:5432/godlovesdiversity?schema=public

# ─── Redis ───
REDIS_URL=redis://redis:6379

# ─── Auth ───
NEXTAUTH_URL=https://gld.tondomaine.com
NEXTAUTH_SECRET=mtnrXgLO72aGMjdzN+ssrNkTVV2zT13qNcLCnnHHUa0=
ADMIN_EMAIL=arnaud@gredai.com
ADMIN_PASSWORD=GodLoves2026!

# ─── Storage MinIO ───
S3_ENDPOINT=http://minio:9000
S3_PUBLIC_ENDPOINT=https://gld.tondomaine.com/cdn
S3_REGION=us-east-1
S3_BUCKET=godlovesdiversity
S3_ACCESS_KEY=gldminio
S3_SECRET_KEY=gldminio-secret

# ─── App ───
NEXT_PUBLIC_SITE_URL=https://gld.tondomaine.com
NEXT_PUBLIC_DEFAULT_LOCALE=fr

# ─── Optionnel : à remplir plus tard depuis /admin/settings ───
# GEMINI_API_KEY=
# RESEND_API_KEY=
# NEXT_PUBLIC_MAPBOX_TOKEN=
```

⚠️ **Remplace `gld.tondomaine.com` par ton vrai sous-domaine** (Cmd+F dans le bloc).

⚠️ **Change `ADMIN_PASSWORD`** par un mot de passe fort (au moins 16 caractères mêlant majuscules, minuscules, chiffres et symboles).

---

## Étape 4 — Healthcheck & build

Toujours dans la config Coolify :
- **Health check URL** : `/`
- **Health check interval** : 30s
- **Build timeout** : 600 (10 min, par sécurité pour le 1er build)
- **Auto-deploy on push** : ✅ Activé

---

## Étape 5 — Deploy

Clique sur **"Deploy"**. Coolify :
1. Clone le repo
2. Lance `docker compose up -d` (build l'image web + démarre tous les services)
3. Le conteneur `web` exécute auto au boot :
   - `prisma db push` → crée toutes les tables
   - `prisma db seed` → crée l'admin + démo
   - `node server.js` → démarre Next.js
4. Coolify configure le reverse proxy Traefik + certificat Let's Encrypt automatique

Le 1er deploy prend 4-6 minutes. Les suivants ~1 min (cache Docker).

---

## Étape 6 — Premiers tests

Une fois le déploiement vert :

1. Ouvre `https://gld.tondomaine.com` → tu vois la home avec rosace néon ✅
2. Va sur `https://gld.tondomaine.com/admin/login`
   - Email : `arnaud@gredai.com`
   - Mot de passe : celui que tu as mis dans `ADMIN_PASSWORD`
3. **Change le mot de passe admin immédiatement** (à venir dans une page Profile, pour l'instant via Prisma Studio si besoin)
4. Va dans **Paramètres → Gemini IA** → colle ta clé pour activer toute l'IA
5. Va dans **Paramètres → Resend** → colle ta clé pour activer les vraies emails

---

## Étape 7 — Domaines additionnels (optionnel)

Si tu veux exposer MinIO publiquement (pour servir les images) :
- Coolify → ton service `minio` → ajoute le domaine `cdn.gld.tondomaine.com`
- Mets à jour la var `S3_PUBLIC_ENDPOINT=https://cdn.gld.tondomaine.com`
- Redeploy

Sinon, les images passent par le proxy Next via `/api/storage/[...key]` (déjà fonctionnel).

---

## Backups Postgres (recommandé)

Coolify → service `postgres` → **Backups** → "Daily" + retention 7 jours.

---

## Mise à jour future

Tu push sur `main` → Coolify rebuild auto en 1-2 min. Aucune intervention manuelle.

```bash
cd ~/Desktop/godlovedirect
# tu modifies du code
git add . && git commit -m "feat: ..." && git push
# Coolify déploie automatiquement
```

---

## Si quelque chose plante

| Problème | Solution |
|---|---|
| Build échoue | Coolify → onglet "Logs" → cherche l'erreur. Souvent : variable env manquante. |
| Site répond 502 | Le conteneur `web` n'a pas démarré. Logs → cherche "Ready in Xms". Attends 30 s de plus. |
| "Invalid client" sur /admin/login | `NEXTAUTH_SECRET` ou `NEXTAUTH_URL` incorrect. Vérifier qu'ils matchent ton domaine HTTPS. |
| Galerie vide | Normal au 1er boot, le seed crée 4 photos demo. Si vide → `docker exec gld-web npx prisma db seed`. |
| Images ne chargent pas | `S3_PUBLIC_ENDPOINT` doit être joignable depuis le navigateur. Si MinIO interne, utilise le proxy `/api/storage/...`. |

---

## 🎯 Prêt ?

Donne-moi ton **URL Coolify + token API** et je peux automatiser les étapes 2-5 via curl si tu préfères.
Sinon ce guide te prend littéralement 15 minutes en cliquant dans Coolify.
