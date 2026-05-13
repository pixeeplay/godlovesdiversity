# ✅ Stratégie finale Phase 4 — Scrape + CSV → 2 sites différenciés

**Date :** 13 mai 2026
**Statut :** Scripts prêts, dry-run validé, **prêt à importer en BDD**

---

## 📊 Données récupérées

### Scrape WordPress parislgbt.com (414/439 OK = 94.3%)

| Type | Nombre |
|---|---|
| **job_listing** (listings + events) | **315** |
| events-venue | 34 |
| tags | 30 |
| pages | 18 |
| catégories | 13 |
| régions | 4 |

Failures (25) : essentiellement des **événements** avec descriptions très longues qui ont dépassé le token-limit Gemini. Récupérables via CSV (la plupart sont dedans).

### CSV "Liste LGBT finale" (2 711 venues exploitables)

| Catégorie | Nombre |
|---|---|
| Santé & Prévention | 1 263 |
| Associations | 624 |
| Bars | 206 |
| Saunas | 124 |
| Restaurants | 108 |
| Clubs | 106 |
| Boutiques | 89 |
| Visites & Tourisme | 77 |
| Cruising | 61 |
| Cabarets & Spectacles | 20 |
| Collectifs & Orga | 14 |
| Hébergements | 10 |

Couverture : **29 régions, 1 036 villes** (Paris 361, Lyon 86, Nice 75, Marseille 60, Toulouse 59, Lille 47, Bordeaux 43...).

---

## 🎯 Stratégie de merge (anti-duplicate content)

```
┌─────────────────────────────────────────────────────────────────┐
│  parislgbt.com  (preserve SEO du site WordPress actuel)          │
├─────────────────────────────────────────────────────────────────┤
│  315 listings + events  ←─── scrape WP (URLs + descriptions)    │
│  363 Paris venues       ←─── CSV (CP 75xxx not in WP)           │
│  ───────────────────                                             │
│  678 listings total                                              │
│  Contenu : descriptions WP d'origine (préserve SEO indexé)      │
│  Slugs : 100% identiques à l'ancien parislgbt.com               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  lgbtfrance.fr  (nouveau site, France entière)                   │
├─────────────────────────────────────────────────────────────────┤
│  2 701 venues  ←─── CSV (toutes régions)                         │
│  Contenu : descriptions CSV (différentes du WP) → no dup content│
│  Meta titles : focus régional ("X — bar LGBT à Y (Région) | …") │
│  Slugs : générés depuis les noms                                │
└─────────────────────────────────────────────────────────────────┘
```

### 🔑 Différenciation contenus (anti-duplicate Google)

**Même venue présente sur les 2 sites** (ex: Le Mensch à Paris) :

| | parislgbt.com | lgbtfrance.fr |
|---|---|---|
| **URL** | `/listing/le-mensch` | `/listing/le-mensch` |
| **Title** | `Le Mensch : bars LGBT à Paris (75003) \| parislgbt` | `Le Mensch — Bars LGBT à Paris (Île-de-France) \| LGBT France` |
| **Meta-desc** | "Bar 100% sexe et fetish. Le bar le plus fetish du Marais. Adresse, horaires sur parislgbt.com" | "Le Mensch fait partie de notre annuaire des bars LGBT en Île-de-France. Lieu à Paris..." |
| **Description** | (WordPress scrape original) | (CSV — texte différent) |
| **Source** | `source_url: parislgbt.com/listing/le-mensch/` | (CSV import) |

→ Google verra 2 pages similaires mais avec **titres + meta-descriptions + descriptions différents** = pas pénalisé pour duplicate content, et **2 référencements distincts** (boost SEO).

---

## 🚀 Comment lancer l'import (3 options)

### Option A — Direct depuis ton Mac (simple, nécessite accès Postgres Coolify)

Si tu peux ouvrir le port Postgres sur Coolify (Coolify → Database → Settings → Public Port) :

```bash
cd ~/Desktop/parislgbt.com

# 1. Test dry-run (déjà validé, juste pour rappel)
bash scripts/dry-final.sh

# 2. Vrai import (utilise DATABASE_URL Coolify)
export DATABASE_URL="postgresql://gld:gld@51.75.31.123:<port-postgres>/parislgbt?schema=public"
npx tsx scripts/import-final.ts
```

### Option B — Depuis le container Coolify (plus sûr, recommandé)

```bash
# 1. Commit + push tout
cd ~/Desktop/parislgbt.com
git add -A
git commit -m "feat(phase4): import scrape+CSV merger ready (678 Paris + 2701 France)"
git push origin feat/lgbt-refonte-c

# 2. Attendre redeploy Coolify (~3 min) → schema appliqué via prisma db push

# 3. Ouvrir le terminal du container Coolify :
#    Coolify → Applications → parislgbt-web → Terminal
#    (ou via SSH si tu as accès au serveur)

# 4. Dans le container :
cd /app
npx tsx scripts/import-final.ts
```

### Option C — POST /api/admin/import (à créer plus tard)

Endpoint sécurisé qui lance l'import via API. Pour l'instant, Option B suffit.

---

## 📋 Après import, vérifications

```bash
# Routes WordPress doivent répondre 200
curl -sI https://lgbt.pixeeplay.com/fr/listing/le-mensch       # 200
curl -sI https://lgbt.pixeeplay.com/fr/category/bars            # 200 + 206 bars listés
curl -sI https://lgbt.pixeeplay.com/fr/category/sante           # 200 + 1263 ressources santé

# Compter listings
curl -s https://lgbt.pixeeplay.com/sitemap.xml | grep -c '<loc>'  # > 5000 URLs

# Vérifier différenciation (DOIT être différent entre Paris et France) :
# Quand parislgbt.com pointera vers Coolify :
#   curl https://parislgbt.com/fr/listing/le-mensch        ← contenu WP
#   curl https://lgbtfrance.fr/fr/listing/le-mensch        ← contenu CSV
```

---

## 📂 Fichiers prêts (à commit)

```
prisma/schema.prisma                      ← +11 modèles (Listing, Category, etc.)
src/app/[locale]/category/[slug]/page.tsx ← Route WP-compat
src/app/[locale]/listing/[slug]/page.tsx  ← + JSON-LD LocalBusiness
src/app/[locale]/tag/[slug]/page.tsx
src/app/[locale]/region/[slug]/page.tsx
src/app/sitemap.ts                        ← Sitemap dynamique étendu
scripts/parislgbt-scraper.js              ← Pipeline Gemini (déjà exécuté)
scripts/import-final.ts                   ← Script merge prêt
scripts/import-csv-to-db.ts               ← Alternative CSV-only
scripts/import-merge-to-db.ts             ← Alternative merge avec diff
scripts/data/liste-lgbt-france.csv        ← Source CSV (2711 venues)
scripts/output/*.json                     ← 414 JSON scrapés
scripts/run-bg.sh, run-scrape.sh          ← Helpers
.gitignore                                ← exclut output/, .env
```

---

## 🎬 Prochaines étapes (après import)

| Phase | Action |
|---|---|
| **5** | Multi-tenant : middleware injecte `site_id` selon hostname, queries Prisma filtrent par site |
| **6** | Mapping URL ancien → nouveau (95% identiques + qq 301) |
| **7** | DNS swap parislgbt.com → IP Coolify |
| **8** | Surveillance GSC 30 jours |

---

## 💡 Bonus pour booster le SEO France

Si tu veux **maximiser** la différenciation contenu lgbtfrance.fr (au-delà des meta-tags) :

1. **Pages régionales auto-générées** : pour chaque région, une page éditoriale présentant les top 10 lieux + un paragraphe historique LGBT de la région
2. **Articles SEO** : "Top 10 bars LGBT à Lyon", "Guide PrEP par région", "Pride 2026 dans le Sud"
3. **Gemini rewrite descriptions** : tourner chaque description CSV pour avoir 2 versions (Paris vs France) avec angle différent

→ Tu me dis si tu veux que je code l'un de ces 3 boosts en plus.
