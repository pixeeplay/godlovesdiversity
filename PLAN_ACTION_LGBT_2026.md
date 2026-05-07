# 🌈 Plan d'action — parislgbt.com + francelgbt.com

**Date :** 7 mai 2026
**Owner :** Arnaud (arnaud@gredai.com)
**Objet :** Refonte complète du projet "God Loves Diversity" en plateforme **LGBTQIA+** double-domaine, avec déploiement Coolify sur sous-domaine de transition `lgbt.pixelplay.com`.

---

## 0. Objectifs (en une phrase)

> Reprendre l'ossature technique du projet GLD, **éradiquer toutes les références religieuses**, et la transformer en une plateforme queer fun/sexy/militante qui sert **deux domaines à partir d'un seul codebase** : `parislgbt.com` (focus Paris) et `francelgbt.com` (toute la France), avec mise en staging sur `lgbt.pixelplay.com`.

### Ce qu'on garde absolument

- Stack : **Next.js 14 · Postgres+PostGIS · Redis · MinIO · Prisma · NextAuth · Gemini · BullMQ · next-intl**
- Upload photo + modération `/admin/moderation`
- Studio IA Gemini (textes + images)
- Newsletter double opt-in RGPD
- Calendrier social multi-réseaux (Insta/FB/X/LinkedIn/TikTok)
- Endpoint mobile `/api/mobile/upload`
- Multilingue FR/EN/ES/PT (next-intl)
- Carte interactive Leaflet/Mapbox
- Auth admin + audit log

### Ce qui change

- Nom, branding, design complet
- Ontologie de données (lieux, événements, identités queer plutôt que religions/cultes)
- Architecture multi-domaines avec `SITE_SCOPE` (paris|france)
- Tous les contenus, prompts IA, templates emails
- Suppression de tous les fichiers et plans religieux

---

## 1. Phase 0 — Récupération du code (BLOQUANT)

> ⚠️ **Action requise de ta part** : me donner l'URL du repo GitHub. Le dossier actuel ne contient que les fichiers de config — les sous-dossiers `src/`, `prisma/`, `public/`, `docker/`, `data/`, `apps/`, `docs/` sont vides.

| # | Étape | Outil | Sortie |
|---|---|---|---|
| 0.1 | Clone du repo dans `/Users/arnaudgredai/Desktop/parislgbt.com/` | `git clone` | Code complet en local |
| 0.2 | `git checkout -b archive/god-loves-diversity-2026-05-07` | git | Snapshot initial |
| 0.3 | `git checkout -b feat/lgbt-refonte` | git | Branche de travail |
| 0.4 | Inventaire complet via `tree -L 4 -I 'node_modules\|.next\|.git'` | bash | Carte du projet |
| 0.5 | Audit des dépendances (`npm outdated`, `npm audit`) | npm | Liste des MAJ critiques |
| 0.6 | Lancement local : `cp .env.example .env && docker compose up --build` | docker | Vérif que la base tourne |

**Durée estimée :** 30 min.

---

## 2. Phase 1 — Purge des références religieuses

### 2.1 Fichiers Markdown à **supprimer** (déjà identifiés)

- `PLAN_PROJET_GodLovesDiversity.md`
- `PLAN_LIEUX_SAINTS_FETES_RELIGIEUSES.md`
- `IDEES_SPIRITUEL_VIRTUEL.md`
- `RAPPORT_AUDIT_GLD_2026-05-04.md`
- `RAPPORT_AUDIT_GLD_2026-05-06.md`
- `RAPPORT_GLD_4MAI2026.pdf`
- `SCREENSHOTS_LIBRARY_2026-05-06.md`
- `SESSION_RECAP_2026-05-06.md`
- `EVALUATION_ET_PLAN_IA_LOCALE_2026-05-06.md`
- `God Loves Diversity.docx`
- `A3  GOD AFFICHE 2025.pdf`
- `cbc1c5c0-3447-4105-9fde-02d480721dac.png` (à inspecter avant)

> Tous archivés dans `archive/god-loves-diversity-2026-05-07` (branche git), pas perdus.

### 2.2 Audit sémantique automatisé

Recherche regex sur tout le code et les contenus (insensible à la casse) :

```
god|dieu|divin|saint|sacre|sacré|religion|interreligieux|culte|foi|prière|priere|spirituel|mosquée|synagogue|église|temple|chrétien|juif|musulman|bouddhiste|hindouiste|catholique|évangélique|protestant|GodLovesDiversity|gld[-_ ]
```

→ Rapport généré dans `docs/audit-religieux.md` avec la liste fichier:ligne pour chaque match.

### 2.3 Renommage global

| Avant | Après |
|---|---|
| `godlovesdiversity` (package.json) | `parislgbt-platform` |
| `GLD` / `gld_` partout | `PLF` / `plf_` (Paris-LGBT-France) |
| Logo `GOD ❤️ DIVERSITY` | Logo redesign (cf. moodboard choisi) |
| Bucket MinIO `godlovesdiversity` | `parislgbt` |
| `NEXTAUTH_URL=godlovesdiversity.com` | `NEXTAUTH_URL=parislgbt.com` (dynamique selon scope) |
| `seed.ts` admin par défaut | Email & mot de passe nouveaux par env |
| Hashtag `#GodLovesDiversity` | `#parislgbt` `#francelgbt` |

### 2.4 Réécriture des contenus

- **Tous les fichiers `src/messages/*.json`** (FR/EN/ES/PT) → réécrits LGBT
- **Prompts Gemini** dans `src/lib/gemini.ts` → contexte LGBT, ton fun/inclusif, glossaire pride
- **Templates emails** (`src/lib/email/*` ou `src/emails/*`) → newsletter, confirmation upload, modération → tous redesignés LGBT
- **Pages statiques** (À propos, manifeste, mentions) → nouveau récit éditorial

**Livrable :** branche `feat/lgbt-refonte` avec 0 occurrence du regex religieux + commit `chore: purge religious references`.
**Durée estimée :** 4-6 h.

---

## 3. Phase 2 — Architecture multi-domaines (paris/france)

### 3.1 Stratégie

Une seule appli Next.js, mais qui se comporte comme **2 sites différents** selon le hostname.

```
Hostname                  →  SITE_SCOPE  →  Comportement
parislgbt.com             →  paris       →  Filtre Place/Event sur scope=paris, contenu Paris
francelgbt.com            →  france      →  Toutes les villes, vue France entière
lgbt.pixelplay.com        →  staging     →  Bascule possible Paris/France via switcher
localhost:3000            →  dev         →  Idem staging
```

### 3.2 Implémentation

**A. Middleware Next.js (`src/middleware.ts`)**

```ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const scope =
    host.includes('parislgbt.com') ? 'paris' :
    host.includes('francelgbt.com') ? 'france' :
    host.includes('lgbt.pixelplay.com') ? 'staging' :
    'dev';

  const res = NextResponse.next();
  res.headers.set('x-site-scope', scope);
  return res;
}

export const config = { matcher: ['/((?!_next|api/health|.*\\..*).*)'] };
```

**B. Helper côté serveur (`src/lib/scope.ts`)**

```ts
import { headers } from 'next/headers';

export type Scope = 'paris' | 'france' | 'staging' | 'dev';

export function getScope(): Scope {
  const h = headers();
  return (h.get('x-site-scope') as Scope) ?? 'dev';
}

export function scopedWhere(scope: Scope) {
  if (scope === 'paris') return { city: 'Paris' };       // ou bbox PostGIS
  if (scope === 'france') return {};                     // pas de filtre
  return {};                                              // staging/dev = tout
}
```

**C. Schéma Prisma — ajout du champ `scope`**

```prisma
model Place {
  id          String   @id @default(cuid())
  name        String
  type        PlaceType        // BAR, CLUB, ASSO, SAUNA, LIBRAIRIE, SANTE, ESPACE_SAFE...
  city        String           // "Paris", "Marseille", "Lyon"...
  region      String?          // "Île-de-France"...
  lat         Float
  lng         Float
  scope       Scope[]          // ["paris","france"] — un lieu peut apparaître sur les 2
  identities  Identity[]       // qui est explicitement accueilli
  accessibility Json?
  // ... reste du modèle
}

enum Scope { PARIS FRANCE }
```

**D. SEO & métadonnées**

- 2 sitemaps séparés (`/sitemap-paris.xml`, `/sitemap-france.xml`) générés selon hostname
- `og:image` adaptée (Tour Eiffel + drapeau pride pour Paris ; carte de France queer pour France)
- `hreflang` croisé entre les 2 domaines
- Robots.txt par scope

**E. Switcher en header**

Composant `<ScopeSwitch />` qui montre "Paris ↔ France" en haut du site, avec lien vers l'autre domaine.

**Livrables :**
- `src/middleware.ts`
- `src/lib/scope.ts`
- Migration Prisma `add_scope_to_place_event`
- Composant `<ScopeSwitch />`
- 2 sitemaps dynamiques

**Durée estimée :** 6-8 h.

---

## 4. Phase 3 — Refonte design

### 4.1 Choix moodboard

> Tu choisis dans le fichier `MOODBOARDS_LGBT.html` que je viens de générer (3 directions : Néon Nuit, Pastel Pop, Hybride Pride). Une fois choisi → application sur tous les composants.

### 4.2 Design tokens (Tailwind)

`tailwind.config.ts` réécrit avec :
- Palette dépendant du moodboard choisi
- Polices Google Fonts dans `next/font`
- Animations custom (pulse-pride, glow-magenta, magnetic-cta)
- Drapeaux pride disponibles en utility (`bg-pride-classic`, `bg-trans-flag`, `bg-bi-flag`, `bg-lesbian-flag`, `bg-pan-flag`, `bg-ace-flag`, `bg-nb-flag`, `bg-progress-flag`)

### 4.3 Composants UI à refaire

| Composant | Avant (GLD) | Après (LGBT) |
|---|---|---|
| `<NavBar />` | Top simple + langue | Top sticky avec scope switch + langues + auth |
| `<Hero />` | "GOD ❤️ DIVERSITY" | Hero animé selon moodboard, drapeau pride en accent |
| `<Card />` | Card photo générique | Variants : Place, Event, Article, Identity |
| `<MapView />` | Stub | Leaflet + clusters + filtres latéraux |
| `<Footer />` | Coordonnées GLD | Footer pride + assos partenaires + manifeste |
| `<NewsletterForm />` | Email simple | Email + identité optionnelle + scope pref |
| `<UploadForm />` | Photo | Photo + lieu + tags identités + consent RGPD |

### 4.4 Pages publiques (nouvelle arborescence)

```
/                         Home (hero scope-aware)
/[locale]/pride           Agenda Pride (toutes Marches, festivals)
/[locale]/soirees         Nightlife — clubs, soirées récurrentes & ponctuelles
/[locale]/lieux           Carte interactive (filtres : type, identité, accessibilité)
/[locale]/lieux/[slug]    Fiche lieu détaillée
/[locale]/identites       Pédagogie : orientations sexuelles + identités de genre
                          Glossaire, drapeaux, ressources, FAQ
/[locale]/sante           Santé sexuelle & mentale (PrEP, dépistage, médecins LGBT-friendly)
/[locale]/assos           Annuaire des associations LGBT+
/[locale]/agenda          Calendrier événements (toutes catégories)
/[locale]/articles        Articles éditoriaux + témoignages
/[locale]/articles/[slug] Article détaillé
/[locale]/participer      Soumettre lieu, événement, photo, témoignage
/[locale]/tech            Page "comment ça marche" — open source, auto-hébergé, contribuer
/[locale]/manifeste       Notre raison d'être (sans religion, militant LGBT)
/[locale]/contact         Formulaire contact + RGPD

/admin                    Back-office (login, dashboard, modération, IA, social, newsletter, settings)
/api/...                  Idem original
```

### 4.5 Animations & micro-interactions

- Framer Motion pour les reveals au scroll
- Hover lift + glow sur les cards (variant moodboard)
- Cursor magnétique sur les CTAs principaux
- Transitions de page douces (App Router)
- Mode sombre persistant (localStorage)

**Livrables :**
- `tailwind.config.ts` v2
- Composants UI dans `src/components/ui/*`
- Toutes les pages dans `src/app/[locale]/*`
- 4 messages JSON traduits

**Durée estimée :** 16-20 h.

---

## 5. Phase 4 — Adaptation des features

### 5.1 Schéma Prisma

```prisma
model Place {
  id            String       @id @default(cuid())
  slug          String       @unique
  name          String
  type          PlaceType
  description   String?
  address       String
  city          String
  postalCode    String?
  region        String?
  country       String       @default("FR")
  lat           Float
  lng           Float
  scope         Scope[]
  identities    Identity[]   // who explicitly welcome
  accessibility Json?        // wheelchair, gender-neutral toilets, signage...
  hours         Json?        // opening hours
  priceLevel    Int?
  website       String?
  instagram     String?
  phone         String?
  photos        Photo[]
  events        Event[]
  status        PlaceStatus  @default(PENDING)   // PENDING | PUBLISHED | ARCHIVED
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  createdBy     User?        @relation(fields: [createdById], references: [id])
  createdById   String?
}

enum PlaceType {
  BAR              // bar/café queer-friendly
  CLUB             // boîte de nuit
  CABARET          // drag, cabaret queer
  RESTAURANT
  SAUNA
  CRUISING         // espaces cruising signalés
  SEX_POSITIVE     // soirée/lieu sex-positive
  ASSO             // association
  CENTRE_LGBT      // centre LGBT
  LIBRAIRIE        // librairie queer
  CINEMA           // ciné LGBT-friendly
  SANTE            // centre santé / médecin LGBT-friendly
  ESPACE_SAFE      // espace de parole/écoute
  HEBERGEMENT      // refuges (mineurs, personnes trans...)
  CULTURE          // musée, galerie queer
  AUTRE
}

model Event {
  id            String       @id @default(cuid())
  slug          String       @unique
  title         String
  description   String?
  type          EventType
  startsAt      DateTime
  endsAt        DateTime?
  recurring     RRule?       // règle iCal pour les récurrents
  placeId       String?
  place         Place?       @relation(fields: [placeId], references: [id])
  city          String
  scope         Scope[]
  pricing       Json?        // { free, gratuit_avant_minuit, prix_normal: 12 }
  ageRestriction String?     // "18+", "tout public"
  identities    Identity[]
  cover         Photo?       @relation(fields: [coverId], references: [id])
  coverId       String?
  status        EventStatus  @default(PUBLISHED)
  createdAt     DateTime     @default(now())
}

enum EventType {
  PRIDE_MARCH       // Marche des Fiertés
  PRIDE_AFTER       // After-marche
  CLUB_NIGHT        // Soirée club
  TEA_DANCE         // Tea dance / soirée jour
  DRAG_SHOW
  CABARET
  CONFERENCE
  ATELIER           // workshop
  PERMANENCE        // perm asso
  DEPISTAGE         // session dépistage
  CINEMA
  EXPO
  FESTIVAL
  AUTRE
}

model Identity {
  id     String  @id @default(cuid())
  slug   String  @unique  // "gay", "lesbian", "bi", "trans", "nb", "queer", "ace", "pan", "intersex", "+"
  label  Json     // i18n
  flag   String   // url svg du drapeau
  order  Int      @default(0)
}

// Conservés du projet original :
model User { ... NextAuth ... }
model Photo { ... avec moderation status ... }
model Article { ... TipTap ... }
model NewsletterSubscriber { ... double opt-in ... }
model AuditLog { ... }
model SocialPost { ... BullMQ ... }
```

Migration Prisma : `npx prisma migrate dev --name lgbt_refonte_v1`.
Seed : exemples de lieux/events Paris (Le Marais, La Java, le Centre LGBT…) et France (Marseille, Lyon, Toulouse, Lille).

### 5.2 Carte interactive (Leaflet)

`src/components/map/MapView.tsx` :
- Tile layer dark (CartoDB Voyager Dark) ou clair selon design
- Clusters (`leaflet.markercluster`)
- Marqueurs custom par `PlaceType`
- Filtres latéraux : Type · Identité accueillie · Accessibilité · Prix
- Popup avec photo, infos rapides, lien fiche
- Géolocalisation utilisateur
- 2 vues : Paris bbox / France entière

### 5.3 IA Gemini — prompts réécrits

`src/lib/gemini.ts` :
```ts
const SYSTEM_PROMPT = `Tu es l'assistant éditorial de parislgbt.com et francelgbt.com,
plateformes communautaires LGBTQIA+. Ton ton : fun, inclusif, militant sans être agressif,
sex-positif sans être cru, joyeux. Glossaire : utilise l'écriture inclusive raisonnée
(point médian autorisé), respecte les pronoms et identités. Évite les stéréotypes.
Pas de mention religieuse. Cible : 18-45, communauté queer francophone.`;
```

Templates :
- Légende photo (post Insta)
- Article éditorial
- Témoignage anonymisé
- Brouillon newsletter
- Description de lieu/événement
- Modération assistée (suspect ou pas)

### 5.4 Newsletter

- Templates HTML refondus (header drapeau pride, footer minimaliste, bouton désinscription)
- Segments : par scope (Paris/France), par identités déclarées, par centres d'intérêt (soirées/santé/assos)
- Préférences sauvegardables sans login (token edit)

### 5.5 Calendrier social

- Préréglages de hashtags : `#parislgbt #francelgbt #pride #marche #queerparis #queerfrance #lgbt+`
- Templates pour Insta/FB/X/LinkedIn/TikTok adaptés au scope (Paris ou France)
- Scheduler BullMQ inchangé

### 5.6 Endpoint mobile

`POST /api/mobile/upload` — conservé tel quel + `X-Device-Token`.
Ajout `POST /api/mobile/events/discover` (pull événements proches) pour préparer V2.

**Livrables :**
- Migration Prisma + seed LGBT
- Composant MapView
- Lib gemini réécrite
- Templates email LGBT
- Tests des endpoints

**Durée estimée :** 12-16 h.

---

## 6. Phase 5 — Docker rebuild + test local

### 6.1 Dockerfile (multi-stage Next.js standalone)

```Dockerfile
# Stage 1 — deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

# Stage 2 — build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

# Stage 3 — run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

`next.config.mjs` → ajouter `output: 'standalone'`.

### 6.2 docker-compose.yml (production-like)

Services :
- `web` (Next.js)
- `db` (postgis/postgis:16-3.4)
- `redis` (redis:7-alpine)
- `minio` (minio/minio)
- `mailpit` (axllent/mailpit, dev only)
- `worker` (BullMQ worker — V1.5)

Healthchecks sur tous, volumes persistants pour `db_data`, `minio_data`.

### 6.3 Tests locaux à valider

```
[ ] docker compose up --build → 0 erreur
[ ] http://localhost:3000 affiche le hero LGBT (pas de mention religieuse)
[ ] /pride affiche l'agenda Pride
[ ] /soirees affiche les soirées club
[ ] /lieux affiche la carte avec marqueurs
[ ] /identites affiche le glossaire avec drapeaux
[ ] /sante affiche les ressources santé
[ ] /participer permet l'upload (vérif modération PENDING)
[ ] /admin/login → connexion OK
[ ] /admin/moderation → modèle reçoit l'email Mailpit
[ ] /admin/ai → prompts Gemini renvoient du contenu LGBT
[ ] /admin/calendar → planification d'un post fonctionne
[ ] /admin/newsletter → édition + envoi de test fonctionne
[ ] http://localhost:9001 → bucket MinIO `parislgbt` existe
[ ] http://localhost:8025 → emails de notif visibles
[ ] Switcher Paris ↔ France change le scope visible
[ ] FR/EN/ES/PT fonctionnent
```

**Durée estimée :** 4-6 h (build + debug).

---

## 7. Phase 6 — GitHub + Coolify

### 7.1 GitHub

```bash
# Dans /Users/arnaudgredai/Desktop/parislgbt.com/
git status                          # vérifier
git add .
git commit -m "feat: LGBT refonte complète + multi-domaines"
git remote remove origin            # si l'ancien existe
git remote add origin git@github.com:gredai/parislgbt-platform.git
git push -u origin feat/lgbt-refonte
# Une fois validé, merge dans main
```

→ Tu crées le repo `parislgbt-platform` (private) sur ton compte GitHub.
→ Ajout d'un `.github/workflows/ci.yml` minimal : lint + typecheck + test build Docker.

### 7.2 Coolify

1. **+ New Resource → Docker Compose** sur l'instance Coolify
2. Source : `gredai/parislgbt-platform` (branch `main`)
3. Compose file : `docker-compose.yml`
4. Domaines :
   - `web` → `lgbt.pixelplay.com` (staging — toggle Paris/France via switcher)
   - Plus tard : `parislgbt.com` et `francelgbt.com` (avec auto-detection middleware)
5. Variables d'env (à copier depuis `.env.example`) :
   ```
   DATABASE_URL=...
   REDIS_URL=redis://redis:6379
   NEXTAUTH_SECRET=$(openssl rand -base64 32)
   NEXTAUTH_URL=https://lgbt.pixelplay.com
   ADMIN_EMAIL=arnaud@gredai.com
   ADMIN_PASSWORD=<à choisir>
   S3_ENDPOINT=...
   S3_PUBLIC_ENDPOINT=https://cdn.lgbt.pixelplay.com
   RESEND_API_KEY=...
   GEMINI_API_KEY=...
   META_APP_ID=...
   X_API_KEY=...
   LINKEDIN_CLIENT_ID=...
   TIKTOK_CLIENT_KEY=...
   ```
6. Coolify build → migrations Prisma au boot → seed
7. **Backup Postgres** → Daily activé
8. **HTTPS auto** via Let's Encrypt
9. Vérif `https://lgbt.pixelplay.com` 200 OK

### 7.3 Plus tard : domaines de production

Quand tu es prêt à passer en prod :
1. Pointer DNS `parislgbt.com` (A record → IP Coolify)
2. Pointer DNS `francelgbt.com` (A record → même IP)
3. Dans Coolify, ajouter les 2 domaines au service web (Coolify gère SNI)
4. Le middleware Next.js détecte le hostname → SITE_SCOPE auto

**Durée estimée :** 2-3 h.

---

## 8. Phase 7 — QA, SEO, accessibilité

### 8.1 SEO

- Sitemaps séparés `/sitemap-paris.xml` et `/sitemap-france.xml`
- Robots.txt par scope
- og:image dynamique par page (lieu, event, article)
- hreflang croisé
- Structured Data : `Place`, `Event`, `Organization` (schema.org)
- Soumission Google Search Console (les 2 domaines)

### 8.2 Accessibilité (WCAG AA)

- Audit Lighthouse > 90 sur les 5 pages clés
- Contraste vérifié (vs moodboard choisi)
- Keyboard navigation complète
- ARIA labels sur les composants interactifs
- Alternatives textuelles sur toutes les images
- Vidéos avec captions (si applicable)

### 8.3 Performance

- Lighthouse Perf > 90 mobile
- Images en `next/image` avec `sizes` et `priority` sur le hero
- Polices via `next/font` avec `display: swap`
- Pas de bibliothèque lourde au chargement initial
- Map Leaflet en `dynamic({ ssr: false })`

### 8.4 Tests E2E (Playwright optionnel V1)

3 scénarios prioritaires :
1. Visiteur découvre Paris, ouvre une fiche lieu, s'inscrit à la newsletter (double opt-in via Mailpit)
2. Admin se connecte, modère une photo, génère un caption Gemini, publie sur Insta
3. Bascule Paris → France, le contenu change, les filtres se mettent à jour

**Durée estimée :** 4-6 h.

---

## 9. Phase 8 — Documentation finale

- `README.md` réécrit (LGBT, sans GLD)
- `CONTRIBUTING.md` (open source friendly)
- `docs/architecture.md` (multi-scope, BullMQ, etc.)
- `docs/admin-guide.md` (manuel pour modération, IA, social, newsletter)
- `docs/api.md` (endpoints publics + mobile)
- `LICENSE` (à choisir : MIT / AGPL ?)

**Durée estimée :** 3-4 h.

---

## 10. Récapitulatif timing

| Phase | Durée | Statut |
|---|---|---|
| 0. Récup code (BLOQUANT) | 30 min | ⏳ Attend URL GitHub |
| 1. Purge religieuse | 4-6 h | ⏳ |
| 2. Multi-domaines | 6-8 h | ⏳ |
| 3. Refonte design | 16-20 h | ⏳ Attend choix moodboard |
| 4. Features adaptées | 12-16 h | ⏳ |
| 5. Docker + test local | 4-6 h | ⏳ |
| 6. GitHub + Coolify | 2-3 h | ⏳ |
| 7. QA / SEO / a11y | 4-6 h | ⏳ |
| 8. Doc | 3-4 h | ⏳ |
| **TOTAL** | **~52-69 h** | |

Soit ~1.5 à 2 semaines en travail concentré, ou ~3-4 semaines si on avance par sessions de 2-3 h.

---

## 11. Décisions à prendre (ouvertes)

| # | Décision | Options |
|---|---|---|
| D1 | **URL repo GitHub** | À donner par toi |
| D2 | **Moodboard** | Néon · Pastel · Hybride (cf. `MOODBOARDS_LGBT.html`) |
| D3 | **Nom de marque** | "parislgbt" simple ou "Paris Pride" ou autre baseline ? |
| D4 | **Tagline FR** | "Le guide queer de Paris", "Paris queer 365", "Fier·e·s, ensemble" ? |
| D5 | **Identités à mettre en avant V1** | Liste à valider (gay, lesbienne, bi, trans, nb, queer, ace, pan, intersexe, +) |
| D6 | **Photos d'illustration** | Banque libre (Unsplash, Pexels) ou commande shoot pro ? |
| D7 | **Couverture France V1** | Paris seul d'abord, puis ajout Marseille/Lyon/Toulouse/Lille/Nantes ? |
| D8 | **Modération a priori vs a posteriori** | Tout en `PENDING` (lent) ou auto-publier puis flag (rapide) ? |
| D9 | **Licence open source** | MIT / AGPL / propriétaire ? |
| D10 | **Pub / monétisation** | Plateforme 100 % sans pub ? Donations ? Adhésion asso ? |

---

## 12. Risques identifiés

| Risque | Impact | Mitigation |
|---|---|---|
| Données religieuses oubliées | Moyen | Audit regex automatisé + double passe humaine |
| Régression d'une feature lors du refactor | Élevé | Garder une branche `archive/`, tests E2E sur les 5 user-flows |
| Performance carte Leaflet avec 2k+ marqueurs | Moyen | Clustering + chargement par bbox + pagination |
| Modération photos sensibles | Élevé | Préfilter Gemini Vision + workflow strict + équipe humaine |
| RGPD newsletter / cookies | Élevé | Double opt-in (déjà là), bandeau cookies, page mentions, DPO |
| Nom de domaine francelgbt.com déjà pris | Bloquant | Vérifier dispo + alternatives (`francequeer.com`, `lgbt.fr`...) |
| Coolify sur lgbt.pixelplay.com bloqué par CSP/iframe | Faible | Tester tôt, ajuster headers |

---

## 13. Prochaine étape immédiate

1. **Tu** : me donnes l'URL GitHub du repo (Phase 0)
2. **Tu** : ouvres `MOODBOARDS_LGBT.html` dans ton navigateur et choisis 1 des 3 directions (D2)
3. **Tu** : me confirmes les décisions D3 à D10 (idéalement par message court)
4. **Moi** : dès que j'ai 1+2, je clone, je lance la Phase 1 (purge) et je te montre le rapport d'audit avant de commiter quoi que ce soit
5. **Moi** : en parallèle de la 1, j'attaque la Phase 2 (middleware + Prisma scope)

---

**🌈 Prêt à transformer cette plateforme en *the* hub LGBT de Paris et de France.**
