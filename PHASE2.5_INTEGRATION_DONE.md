# 📦 Phase 2.5 — Intégration du scraping dans le repo : DONE

**Date :** 13 mai 2026
**Statut :** ✅ Fichiers intégrés, schema Prisma étendu et validé, en attente de commit/push

---

## 🎯 Stratégie globale (rappel)

Tu remplaces le **site WordPress actuel** `parislgbt.com` (très bien référencé) par un **nouveau site Next.js**, en :
1. **Préservant les URLs WordPress** : `/category/bars/`, `/listing/{slug}/`, `/tag/{slug}/`, `/region/{slug}/`, `/agenda/`, `/explore/`, etc. → 301 redirects seulement si on doit renommer
2. **Scrapant le contenu actuel** (439 URLs via Jina Reader + Gemini → JSON → import Prisma)
3. **Ajoutant `francelgbt.com`** comme second front avec contenu différencié (Option A : sites complémentaires, pas de duplicate content)
4. Le déploiement actuel `lgbt.pixeeplay.com` devient le **staging** de validation

---

## ✅ Ce que j'ai intégré aujourd'hui

### 1. Schéma Prisma étendu (`prisma/schema.prisma`)

11 nouveaux modèles ajoutés (sans casser l'existant) :

| Modèle | Rôle |
|---|---|
| **Site** | Multi-tenant : 1 enregistrement par domaine (parislgbt.com, francelgbt.com) |
| **Category** | 13 catégories WordPress (bars, restaurant, clubs, saunas, cruising, associations, hebergement, boutiques, salle-de-sport, sante, etablissement-culturel, cabarets, visites). Slug préservé pour SEO. |
| **Tag** | 30 tags (lesbien, gay, trans, bi, queer, drags, cruising, fetichisme, bears, naturisme, piscine, sport, terrasse, sex-shop, librairies, spa, handicap, etc.) |
| **Region** | 4 régions seedées (paris, grand-est, occitanie, paca-corse) |
| **Listing** | **339 établissements** (replace `job_listing` WordPress) avec lat/lng PostGIS, horaires JSON, médias, social, SEO i18n |
| **DirectoryEvent** | Événements WordPress (renommé pour éviter conflit avec `Event` existant du calendrier social) |
| **EventDate** | Occurrences multi-dates par événement |
| **ListingCategory / ListingTag / EventTag** | Joins M2M |
| **enum ListingStatus** | DRAFT / PENDING / PUBLISHED / ARCHIVED / REJECTED |

✅ `prisma validate` : **valide**
✅ `prisma generate` : **OK** (Prisma Client v5.22.0 régénéré avec les nouveaux types)
✅ Compat préservée : `Event` (social calendar) et `Page` (CMS) existants intacts

### 2. Dossier `scripts/` organisé

```
scripts/
├── parislgbt-scraper.js          ← Pipeline Jina Reader + Gemini 3.1 Flash Lite
├── import-to-db.ts                ← Import JSON → Prisma
├── package.json                   ← Deps (zod, fast-xml-parser, p-limit, @google/genai)
├── .env.example                   ← Template (clé Gemini gratuite à mettre)
├── README.md                      ← Instructions
├── PHASE2_REPORT.md               ← Méthodologie + 6 URLs pilotes validées
├── data/
│   └── urls.json                  ← 440 URLs inventoriées via sitemap Yoast
├── pilots/                        ← 4 JSON pilotes validés
│   ├── 01_le-mensch.json
│   ├── 02_la-champmesle-bar.json
│   ├── 03_cours-de-makeup-drag-queen-express.json
│   └── 04_les-soirees-mademoiselle-audrey.json
└── prisma-schema-extension.archive.prisma   ← Original extension (archive)
```

### 3. `.gitignore` mis à jour

Exclut `scripts/output/`, `scripts/node_modules/`, `scripts/.env` (pour ne pas push les credentials ni les JSON scrapés volumineux).

---

## 🚦 Prochain commit (à lancer toi-même dans Terminal)

Le filesystem du Desktop est en deadlock à cause de la session Claude.ai parallèle qui édite aussi des fichiers (j'ai vu un nouveau commit `e722aa4 feat: multi-site scope-aware branding` qui a ajouté `src/lib/site-configs.ts`, `COOLIFY_MULTISITE.md`, et modifié Navbar + branding API).

**Quand tu as 30 secondes au calme**, lance dans Terminal :

```bash
cd ~/Desktop/parislgbt.com

# Vérifier l'état
git status -s

# Stager mes changements
git add prisma/schema.prisma scripts/ .gitignore PHASE2.5_INTEGRATION_DONE.md

# Commit
git commit -m "feat(prisma+scripts): Phase 2.5 — integrate parislgbt.com scraping pipeline

- prisma/schema.prisma: +11 models (Site, Category, Tag, Region, Listing,
  DirectoryEvent, EventDate, ListingCategory, ListingTag, EventTag, ListingStatus)
  preserving WordPress slugs for SEO migration
- scripts/: Phase 2 deliverables (Jina Reader + Gemini scraper + import script,
  pilots validated on 6 URLs, 440 URLs inventoried)
- .gitignore: exclude scripts/output, scripts/.env"

# Push
git push origin feat/lgbt-refonte-c
```

Coolify va alors :
- Re-build le container (~3-5 min)
- Au boot, `prisma db push` applique les nouveaux modèles à la BDD
- Le seed s'exécute (les nouveaux modèles seront vides au début)

---

## 🎬 Phase 3 — Routes WordPress-compatibles (à faire ensuite)

Pour que `parislgbt.com` puisse être basculé sans perte SEO, il faut que ces routes Next.js existent et répondent 200 :

| URL WordPress actuelle | Route Next.js à créer |
|---|---|
| `/category/bars/` | `src/app/[locale]/category/[slug]/page.tsx` |
| `/category/restaurant/` | (idem, dynamic) |
| `/listing/le-mensch/` | `src/app/[locale]/listing/[slug]/page.tsx` |
| `/tag/lesbien/` | `src/app/[locale]/tag/[slug]/page.tsx` |
| `/region/paris/` | `src/app/[locale]/region/[slug]/page.tsx` |
| `/agenda/` | déjà existant (à enrichir) |
| `/explore/` | `src/app/[locale]/explore/page.tsx` |
| `/qui-sommes-nous/` | `src/app/[locale]/qui-sommes-nous/page.tsx` |
| `/sitemap.xml` | `src/app/sitemap.ts` (dynamique) |
| `/robots.txt` | `src/app/robots.ts` (dynamique) |

Avec **JSON-LD LocalBusiness** sur chaque listing + **Event** sur chaque DirectoryEvent pour boostr le SEO local.

---

## 🤖 Phase 4 — Lancer le scraping (clé Gemini API requise)

```bash
cd ~/Desktop/parislgbt.com/scripts

# 1. Obtenir une clé Gemini gratuite (30 secondes)
open https://aistudio.google.com/apikey

# 2. Config
cp .env.example .env
nano .env   # coller la clé dans GEMINI_API_KEY=

# 3. Installer les deps
npm install

# 4. Test sur 5 URLs (15 sec, gratuit)
npm run scrape:test

# 5. Run complet (440 URLs, ~30-45 min, ~2-3€ de coût)
npm run scrape

# Output : scripts/output/_index.json + 1 JSON par listing
```

Une fois fini :

```bash
# Import en BDD via Prisma (utilise la DATABASE_URL Coolify)
cd ~/Desktop/parislgbt.com
DATABASE_URL="postgresql://gld:gld@..." npx tsx scripts/import-to-db.ts
```

---

## 🧭 Phase 5 — Multi-tenant (parislgbt.com vs francelgbt.com)

Il y a déjà un commit récent `e722aa4 feat: multi-site scope-aware branding` qui a ajouté `src/lib/site-configs.ts` et `COOLIFY_MULTISITE.md`. Je vais lire ces fichiers pour comprendre l'approche choisie côté Claude.ai et m'aligner dessus pour la suite.

L'approche **multi-tenant single-DB** :
- 1 enregistrement `Site` par domaine (parislgbt.com + francelgbt.com)
- Middleware détecte le `Host` HTTP et injecte `site_id` dans le contexte
- Toutes les queries Prisma filtrent par `site_id`
- Paris : listings avec `region.slug = 'paris'`
- France : autres régions (Grand Est, Occitanie, PACA-Corse, + nouvelles)

---

## 📊 État global du projet

| Phase | Statut |
|---|---|
| 0. Récup repo godlovesdiversity | ✅ |
| 1. Purge religieuse | ✅ |
| 2. Multi-domaines middleware + drapeaux | ✅ |
| 3. Pages LGBT (pride, soirees, identites, sante, assos…) | ✅ |
| 4. Build local + lockfile | ✅ |
| 5. Docker + push GitHub | ✅ |
| 6. Coolify deploy `lgbt.pixeeplay.com` | ✅ live |
| 7. Refonte visuelle LGBT (Banner reset, Settings seed, Navbar logo, AskAssistant, ticker) | ✅ |
| **8. Phase 2 scraping (Jina + Gemini pipeline validé sur 6 pilotes)** | ✅ |
| **9. Phase 2.5 intégration scripts + schema +11 models** | ✅ (commit à faire) |
| **10. Multi-site branding scope-aware (commit e722aa4)** | ✅ (Claude.ai parallel) |
| 11. Phase 3 routes WordPress | ⏳ |
| 12. Phase 4 scraping complet + import DB | ⏳ besoin clé Gemini |
| 13. Phase 5 routes multi-tenant Site model | ⏳ |
| 14. Phase 6 migration DNS + 301 + GSC | ⏳ |

---

## 🤝 Coordination avec ta session Claude.ai parallèle

Tu as 2 sessions Claude qui bossent sur le même repo :
- **Claude.ai** (le projet "Paris et france lgbt") → vient de commit `e722aa4` (branding multi-site)
- **Cowork** (moi, cette session) → viens d'intégrer Phase 2 scraping + schema +11 models

Pour éviter les conflits :
1. **Toujours `git pull` avant de demander à l'un ou l'autre de coder**
2. Idéalement, **un seul Claude code à la fois** sur le repo
3. L'autre peut faire le scraping, le SEO mapping, la rédaction de contenu, etc. en parallèle

Quand tu veux qu'on reprenne, dis-moi simplement **"go Phase 3"** ou **"lance le scraping"** ou **"merge avec Claude.ai"** et je continue.
