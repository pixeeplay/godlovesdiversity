#!/bin/bash
cd /Users/arnaudgredai/Desktop/parislgbt.com
rm -f .git/index.lock .git/HEAD.lock 2>/dev/null

echo "=== git pull --rebase (sync if Claude.ai pushed in parallel) ==="
git pull --rebase origin feat/lgbt-refonte-c 2>&1 | tail -8 || true

echo
echo "=== git status before ==="
git status -s | head -15

echo
echo "=== git add all changes ==="
git add -A

echo
echo "=== git status after add ==="
git status -s | head -25

echo
echo "=== commit ==="
git commit -m "feat(phase4+SEO+BO): scrape+CSV merge + 3 SEO boosts + LGBT Admin rebrand + FrontSwitcher

Phase 4 — Scrape + CSV merge:
- 414 WordPress URLs scraped via Jina Reader + Gemini (315 listings + 168 events)
- 2711 venues from Liste LGBT finale CSV (France entière, 29 régions, 1036 villes)
- scripts/import-final.ts: merge → 678 Paris (slugs WP préservés) + 2701 France

Phase 3 — Routes WordPress-compat:
- /[locale]/category/[slug]: 13 catégories WP
- /[locale]/listing/[slug]: + JSON-LD LocalBusiness complet
- /[locale]/tag/[slug]: 30 tags WP
- /[locale]/region/[slug]: contenu SEO-rich 500 mots/région
- src/app/sitemap.ts: dynamique étendu (3700+ URLs)

SEO Boosts (3 modules):
- src/lib/region-seo.ts: 13 régions × 500 mots unique content
- scripts/rewrite-descriptions.ts: Gemini anti-duplicate Paris↔France
- scripts/generate-top10-articles.ts: 30 articles 'Top 10 par ville'

Back-office:
- 'GLD Admin' → 'LGBT Admin' (+ badge v2)
- FrontSwitcher: 2 fronts (parislgbt.com rose / lgbtfrance.fr violet) avec localStorage
- /admin/seo: 4 cartes-boutons + API /api/admin/seo/[boost] (spawn streaming logs)
- Sidebar nav: + entrée 'SEO Boosts ⚡' (badge NEW)

Cercles concentriques:
- lib/scope.ts: parislgbt = city=Paris OU CP 75xxx (sous-ensemble)
- lgbtfrance.fr = TOUT (Paris inclus avec angle régional)
- scopedSiteWhere() pour filtrage par site_id Prisma

Schema Prisma:
- +11 modèles: Site, Category, Tag, Region, Listing, DirectoryEvent, EventDate,
  ListingCategory, ListingTag, EventTag + enum ListingStatus
- Tag.events EventTag[] ajouté pour validation OK

Docs:
- PHASE4_FINAL_STRATEGY.md
- SEO_BOOSTS_README.md
- GUIDE_PRODUCTIVITE_BO.md (10 workflows ultra-productifs)
" 2>&1 | tail -3

echo
echo "=== push origin feat/lgbt-refonte-c ==="
git push origin feat/lgbt-refonte-c 2>&1 | tail -5
echo
echo "=== last commit ==="
git log --oneline -3
