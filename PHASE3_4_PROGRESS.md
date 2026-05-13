# 🚀 Phase 3 + Phase 4 — Progrès en cours

**Date :** 13 mai 2026
**Statut :** ⏳ Scraping en background + routes Next.js créées

---

## ✅ Phase 3 — Routes WordPress-compatibles (DONE)

4 routes Next.js + sitemap dynamique créés, qui reproduisent **exactement** les URLs WordPress de l'ancien parislgbt.com :

| Route Next.js | URL WordPress équivalente | SEO |
|---|---|---|
| `src/app/[locale]/category/[slug]/page.tsx` | `/category/bars/`, `/category/clubs/`, etc. | JSON-LD CollectionPage + meta i18n |
| `src/app/[locale]/listing/[slug]/page.tsx` | `/listing/le-mensch/`, `/listing/la-champmesle-bar/` | **JSON-LD LocalBusiness complet** (name, address, geo, openingHours, sameAs) + canonical |
| `src/app/[locale]/tag/[slug]/page.tsx` | `/tag/lesbien/`, `/tag/gay/`, etc. | meta + canonical |
| `src/app/[locale]/region/[slug]/page.tsx` | `/region/paris/`, `/region/occitanie/`, etc. | meta + description |
| `src/app/sitemap.ts` | `/sitemap.xml` | **Dynamique** : pages statiques × locales + listings + categories + tags + regions |

### JSON-LD LocalBusiness exemple (pour SEO local Google)

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Le Mensch",
  "description": "Bar 100% sexe et fetish",
  "telephone": "09 53 53 38 84",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "34 rue Charlot",
    "postalCode": "75003",
    "addressLocality": "Paris"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 48.86252,
    "longitude": 2.36223
  },
  "openingHours": ["Mo 21:00-02:00", "We 21:00-02:00", "Th 18:00-04:00", ...],
  "sameAs": ["https://www.facebook.com/menschpub"]
}
```

---

## ⏳ Phase 4 — Scraping en cours

| Métrique | Valeur |
|---|---|
| URLs totales | 439 |
| Scrapées (en cours) | ~46+ ⏳ |
| ETA | ~60-80 min (rate-limit Gemini 3.1 Flash Lite) |
| Coût estimé | ~2-3 € |
| PID | 86468 |
| Log | `scripts/output/scrape.log` |

**Vérifier la progression** :
```bash
tail -f ~/Desktop/parislgbt.com/scripts/output/scrape.log
ls ~/Desktop/parislgbt.com/scripts/output/*.json | wc -l
```

**Pour stopper si besoin** :
```bash
kill $(cat ~/Desktop/parislgbt.com/scripts/output/.scraper.pid)
```

---

## 📋 Récap des fichiers créés/modifiés aujourd'hui

```
Modified:
  prisma/schema.prisma                          (+205 LOC : 11 nouveaux modèles)
  src/app/sitemap.ts                            (réécrit pour LGBT + nouvelles routes)
  scripts/import-to-db.ts                       (prisma.event → prisma.directoryEvent)
  .gitignore                                    (+ scripts/output, .env)

Created:
  scripts/parislgbt-scraper.js                  (depuis Phase 2 Claude.ai)
  scripts/import-to-db.ts                       (depuis Phase 2)
  scripts/package.json                          (npm deps : zod, fast-xml-parser, p-limit, @google/genai)
  scripts/.env                                  (clé Gemini, gitignored)
  scripts/.env.example
  scripts/README.md
  scripts/PHASE2_REPORT.md
  scripts/data/urls.json                        (440 URLs sitemap)
  scripts/pilots/01-04_*.json                   (4 pilots validés)
  scripts/run-bg.sh                             (lancement background)
  scripts/run-scrape.sh                         (lancement interactif)
  scripts/output/scrape.log                     (log en cours)
  scripts/output/*.json                         (résultats au fur et à mesure)
  scripts/output/.scraper.pid                   (PID pour kill)
  src/app/[locale]/category/[slug]/page.tsx     (Phase 3 — WordPress compat)
  src/app/[locale]/listing/[slug]/page.tsx      (Phase 3 — JSON-LD LocalBusiness)
  src/app/[locale]/tag/[slug]/page.tsx          (Phase 3)
  src/app/[locale]/region/[slug]/page.tsx       (Phase 3)
  PHASE2.5_INTEGRATION_DONE.md
  PHASE3_4_PROGRESS.md                          (ce fichier)
```

---

## 🎬 Étapes suivantes (quand scraping fini)

### Quand `scrape.log` indique "🎉 Terminé" :

```bash
cd ~/Desktop/parislgbt.com

# 1. Vérifier le résultat
cat scripts/output/_index.json | jq '.by_type'
ls scripts/output/listing__*.json | wc -l
ls scripts/output/event__*.json | wc -l

# 2. Commit tout sur git
git add -A
git commit -m "feat(phase3+4): WordPress-compat routes + 440 URLs scraped from parislgbt.com

Phase 3:
- /[locale]/category/[slug]: preserves WP /category/bars/, /clubs/, etc. URLs
- /[locale]/listing/[slug]: preserves WP /listing/{slug}/ + JSON-LD LocalBusiness
- /[locale]/tag/[slug]: preserves WP /tag/{slug}/
- /[locale]/region/[slug]: preserves WP /region/{slug}/
- src/app/sitemap.ts: dynamic sitemap with all listings/categories/tags/regions

Phase 4:
- scripts/output/: 440 JSON files scraped via Jina Reader + Gemini 3.1 Flash Lite
- 339 listings + 34 venues + 30 tags + 19 pages + 13 categories + 4 regions"
git push origin feat/lgbt-refonte-c

# 3. Import en BDD Coolify (DATABASE_URL via Coolify proxy ou en SSH tunnel)
# Option A : depuis Mac, via Coolify-exposed port
DATABASE_URL="postgresql://gld:gld@<coolify-host>:5432/parislgbt?schema=public" \
  npx tsx scripts/import-to-db.ts scripts/output

# Option B : depuis le container Coolify (plus sûr)
# → Coolify → applications/parislgbt-web → Terminal → 
#   npx tsx /app/scripts/import-to-db.ts /app/scripts/output
```

### Tests post-import (Coolify auto-redeploy)

```bash
# Vérifier que les routes WordPress répondent
curl -sI https://lgbt.pixeeplay.com/fr/category/bars      # 200
curl -sI https://lgbt.pixeeplay.com/fr/listing/le-mensch  # 200
curl -sI https://lgbt.pixeeplay.com/sitemap.xml           # 200 + XML valide
curl -s https://lgbt.pixeeplay.com/sitemap.xml | head -50 # vérif structure

# Compter les URLs dans le sitemap
curl -s https://lgbt.pixeeplay.com/sitemap.xml | grep -c '<loc>'
```

---

## 🗺️ Plan pour la suite

| Phase | Action | Statut |
|---|---|---|
| 3 | Routes WP-compat | ✅ |
| 4 | Scraping 439 URLs | ⏳ ~80% |
| 5 | Import JSON → BDD + multi-tenant Site | À faire après scraping |
| 6 | Mapping URLs ancien→nouveau pour 301 | À préparer (95% URLs identiques) |
| 7 | Bascule DNS parislgbt.com | À planifier (week-end recommandé) |
| 8 | Surveillance GSC 30 jours | Post-bascule |
