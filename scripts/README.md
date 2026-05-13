# parislgbt-scraping

Scraping complet de **parislgbt.com** → JSON structuré → import PostgreSQL/Prisma.

## TL;DR

```bash
cd scripts/
cp .env.example .env        # ajouter GEMINI_API_KEY (+ JINA_API_KEY optionnel)
npm install
npm run scrape:test         # tester sur 5 URLs
npm run scrape              # tout (439 URLs, ~30 min, ~2€)
```

Output : `output/*.json` (un fichier par URL).

## Structure

- `data/urls.json` — inventaire des 439 URLs à scraper, par type
- `data/pilot/` — JSON pilotes (4 exemples extraits manuellement pour valider le schéma)
- `data/sitemaps/` — sous-sitemaps XML bruts (page, job_listing, region, tags, etc.)
- `scripts/parislgbt-scraper.js` — script Node.js du pipeline complet
- `scripts/import-to-db.ts` — script Prisma pour seed la base PostgreSQL
- `scripts/prisma-schema-extension.prisma` — modèles à ajouter au repo godlovesdiversity
- `PHASE2_REPORT.md` — rapport détaillé, suite des étapes
