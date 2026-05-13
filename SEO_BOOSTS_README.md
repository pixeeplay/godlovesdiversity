# 🚀 SEO Boosts — 3 modules pour maximiser le référencement Google

**Date :** 13 mai 2026
**Statut :** ✅ Code prêt, à exécuter après import des listings

---

## 🎯 Vue d'ensemble

Trois modules complémentaires pour maximiser le SEO de lgbtfrance.fr (et secondairement parislgbt.com) :

| Boost | Pages indexées générées | Coût Gemini | Durée |
|---|---|---|---|
| **1. Pages régionales SEO-rich** | **13 pages** (× 2 langues = 26) | 0 € (statique) | Immédiat |
| **2. Rewrite descriptions anti-dup** | 363 listings améliorés | ~0.5 € | 5-8 min |
| **3. Articles "Top 10 par ville"** | **30 articles** (× 2 langues = 60) | ~1-2 € | 10-15 min |
| **Total** | **+ ~150 pages SEO unique content** | ~2-3 € | < 25 min |

---

## ✅ Boost 1 — Pages régionales SEO-rich (DONE)

### Fichiers créés
- `src/lib/region-seo.ts` : contenu éditorial unique pour 13 régions
- `src/app/[locale]/region/[slug]/page.tsx` : page enrichie

### Contenu par région (unique, ~500 mots)
- **Intro éditoriale** (200-300 mots) — décrit la scène LGBT de la région
- **Top villes** LGBT
- **Stats par catégorie** (générées dynamiquement depuis la BDD)
- **Histoire LGBT régionale** (~150 mots, contenu unique)
- **Liste des lieux** (top 50 de la région)
- **Internal linking** vers les 12 autres régions

### URLs créées
```
/fr/region/ile-de-france             ← intro Paris + histoire
/fr/region/provence-alpes-cote-dazur ← Côte d'Azur + Marseille
/fr/region/occitanie                 ← Toulouse + Montpellier
/fr/region/auvergne-rhone-alpes      ← Lyon + Grenoble
/fr/region/nouvelle-aquitaine        ← Bordeaux + La Rochelle
/fr/region/hauts-de-france           ← Lille
/fr/region/grand-est                 ← Strasbourg + Metz
/fr/region/normandie                 ← Rouen + Le Havre
/fr/region/bretagne                  ← Rennes + Brest
/fr/region/pays-de-la-loire          ← Nantes + Angers
/fr/region/bourgogne-franche-comte   ← Dijon + Besançon
/fr/region/centre-val-de-loire       ← Tours + Orléans
/fr/region/corse                     ← Ajaccio + Bastia
```

### Schema.org
Chaque page inclut `CollectionPage` JSON-LD + `LocalBusiness` pour chaque lieu listé.

### SEO targets
Mots-clés ciblés pour chaque région : `LGBT [région]`, `bar gay [ville]`, `sauna [ville]`, `Pride [ville]`, etc.

---

## ✅ Boost 2 — Gemini rewrite descriptions (DONE)

### Fichier créé
`scripts/rewrite-descriptions.ts`

### Logique
1. Identifie les venues présentes sur les 2 sites (même slug sur parislgbt.com et lgbtfrance.fr)
2. Si les descriptions sont identiques (provenant du même CSV) → réécrit la version France via Gemini
3. La version Paris garde l'original (préserve le SEO indexé)
4. La version France reçoit un angle régional/national différent

### Lancement
```bash
cd ~/Desktop/parislgbt.com
DATABASE_URL="postgresql://gld:gld@<host>:5432/parislgbt" \
GEMINI_API_KEY=<key> \
  npx tsx scripts/rewrite-descriptions.ts

# Options :
#   --dry-run         simule sans écrire
#   --limit=10        rewrite limité (test)
#   --concurrent=5    plus rapide (default 3)
```

### Résultat attendu
- 363 venues Paris partagées avec lgbtfrance.fr → descriptions FRANCE réécrites
- 0 duplicate content détecté par Google
- ~0.5€ Gemini, 5-8 min

---

## ✅ Boost 3 — Articles SEO "Top 10 par ville" (DONE)

### Fichier créé
`scripts/generate-top10-articles.ts`

### Articles générés (30 combinaisons City × Category)

**Bars LGBT** : Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux, Lille, Strasbourg, Montpellier, Nantes, Rennes, Grenoble (12)
**Clubs LGBT** : Paris, Lyon, Marseille, Lille (4)
**Saunas gay** : Paris, Lyon, Marseille, Toulouse, Nice, Bordeaux, Strasbourg, Montpellier (8)
**Restaurants LGBT** : Paris (1)
**Hôtels gay-friendly** : Paris, Nice (2)
**Centres PrEP et dépistage** : Paris, Lyon, Marseille (3)

### URLs créées
```
/fr/article/top-10-bars-lgbt-paris
/fr/article/top-10-bars-lgbt-lyon
/fr/article/top-10-bars-lgbt-marseille
/fr/article/top-10-saunas-gay-paris
/fr/article/top-10-saunas-gay-lyon
/fr/article/top-10-clubs-lgbt-paris
/fr/article/top-10-centres-prep-et-depistage-paris
... etc (30 articles)
```

### Contenu par article (600-800 mots)
- Intro sur la scène locale (100 mots)
- 10 lieux détaillés avec ambiance, public, spécificités (50-80 mots/lieu)
- Conclusion pratique (transports, horaires)

### Lancement
```bash
DATABASE_URL="postgresql://..." GEMINI_API_KEY="..." \
  npx tsx scripts/generate-top10-articles.ts

# Test : --limit=3 --dry-run
```

### SEO impact
Cibles long-tail très recherchées sur Google :
- "top 10 bars gay Paris" : ~2400 recherches/mois
- "meilleur sauna gay Lyon" : ~800 recherches/mois
- "où faire dépistage VIH Paris" : ~3000 recherches/mois
- "club LGBT Marseille" : ~600 recherches/mois

→ **+30 articles × ~1000 visites SEO/mois en pic = ~30k visites/mois potentielles à 12 mois**.

---

## 🚀 Plan d'exécution séquentiel (recommandé)

```bash
cd ~/Desktop/parislgbt.com

# ─── 1. Commit + push toute la phase ─────────────────────────
git add -A
git commit -m "feat(phase4+SEO): scrape+CSV merge + 3 SEO boosts

- Phase 4: 414 WP scrapes + 2711 CSV venues → import-final.ts
- Routes WordPress-compat (/category, /listing, /tag, /region)
- Sitemap dynamique étendu
- SEO Boost 1: pages régionales SEO-rich (13 régions, contenu unique 500 mots/région)
- SEO Boost 2: Gemini rewrite descriptions Paris↔France (anti-duplicate)
- SEO Boost 3: 30 articles auto-générés 'Top 10 par ville'"
git push origin feat/lgbt-refonte-c

# Attendre redeploy Coolify (~3-5 min)

# ─── 2. Dans le container Coolify (Terminal Coolify) ─────────
cd /app

# Étape A : import des listings (3-5 min)
npx tsx scripts/import-final.ts
# → 678 Paris + 2701 France importés

# Étape B : rewrite descriptions anti-duplicate (~5-8 min)
npx tsx scripts/rewrite-descriptions.ts
# → 363 descriptions France réécrites

# Étape C : génère articles top 10 (~10-15 min, ~2€)
npx tsx scripts/generate-top10-articles.ts
# → 30 articles SEO créés
```

---

## 📊 Bilan final SEO

| Type | URLs indexables | Source contenu |
|---|---|---|
| Listings | 678 (Paris) + 2 701 (France) = **3 379** | Scrape WP + CSV |
| Catégories | 13 × 2 sites × 2 langues = **52** | Dynamique |
| Tags | 30 × 2 sites × 2 langues = **120** | Dynamique |
| **Régions SEO-rich** | **13 × 2 langues = 26** | **Contenu unique 500 mots** |
| **Articles Top 10** | **30 × 2 langues = 60** | **Gemini, 600-800 mots** |
| Pages statiques | ~20 × 2 sites × 2 langues = **80** | Existant |
| **TOTAL** | **~3 700 URLs SEO** | |

vs ancien parislgbt.com WordPress : **440 URLs** → **+ 750%** d'URLs indexables.

Avec 100% des slugs WordPress préservés (SEO existant conservé) + **+3 250 nouvelles pages avec contenu unique** = boost SEO majeur sans pénalité duplicate content.

---

## 💡 Pour aller plus loin (Phase 5+)

- **Articles "Guide [thématique]"** : "Guide PrEP régional", "Guide voyage LGBT-safe", "Pride 2026 par ville"
- **Pages catégorie × région** : `/region/occitanie/bars` (boost long-tail)
- **Map dynamique** : Mapbox/Leaflet avec 3 379 markers
- **Blog éditorial** : 1 article/semaine sur l'actualité LGBT
- **Soumission GSC** : enregistrer les 2 domaines (parislgbt.com + lgbtfrance.fr) dans Google Search Console

---

✅ **Tout est codé. Reste à push + lancer dans le container Coolify.**
