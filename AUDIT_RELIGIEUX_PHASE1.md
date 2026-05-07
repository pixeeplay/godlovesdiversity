# 🔍 Audit religieux Phase 1 — rapport complet avant purge

**Date :** 7 mai 2026
**Source :** repo cloné `pixeeplay/godlovesdiversity@b421449`
**Statut :** ✅ Audit terminé — purge en attente de validation

---

## 📊 Vue d'ensemble

| Mot-clé | Occurrences (fichiers) |
|---|---|
| **GLD** (toujours présent partout) | 241 |
| **god** (mot anglais ou godlovesdiversity) | 103 |
| **prière** | 47 |
| **godlovesdiversity** | 38 |
| temple | 33 |
| synagogue | 29 |
| catholique | 26 |
| spirituel | 23 |
| mosquée | 23 |
| dieu | 23 |
| verset | 22 |
| protestant | 22 |
| église | 21 |
| interreligieux | 21 |
| culte | 19 |
| bouddhiste | 19 |
| prayer | 18 |
| saint | 16 |
| juif | 16 |
| musulman | 15 |
| religion | 12 |
| camino | 12 |
| sacré | 10 |
| officiant | 5 |
| chrétien | 5 |
| sacred | 4 |
| évangélique | 3 |
| (prier) | 3 |

**Total fichiers contenant 1+ référence** : 368
**Lignes de Prisma à toucher** : ~71 modèles/lignes
**Lignes seed.ts religieuses** : 30
**Lignes ai.ts** : 12
**Lignes seo.ts** : 11

---

## 🗑️ A. Fichiers à SUPPRIMER COMPLET

### A.1 Pages publiques (11)
```
src/app/[locale]/calendrier-religieux/page.tsx
src/app/[locale]/camino/page.tsx
src/app/[locale]/cercles-priere/page.tsx
src/app/[locale]/cercles-priere/[circle]/page.tsx
src/app/[locale]/champ-de-priere/page.tsx
src/app/[locale]/compagnon-spirituel/page.tsx
src/app/[locale]/journal/page.tsx                  ← prière vocale
src/app/[locale]/mon-espace/journal/page.tsx       ← idem
src/app/[locale]/officiants/page.tsx
src/app/[locale]/textes-sacres/page.tsx
src/app/[locale]/verset-inclusif/page.tsx
```

### A.2 Routes API (~17)
```
src/app/api/camino/route.ts
src/app/api/officiants/route.ts
src/app/api/prayer-candles/route.ts
src/app/api/prayer-chat/[circle]/route.ts
src/app/api/prayer-chat/route.ts
src/app/api/prayer-intentions/route.ts
src/app/api/prayer-presence/route.ts
src/app/api/prayers/vocal/route.ts
src/app/api/prayers/vocal/[id]/route.ts
src/app/api/prayers/vocal/[id]/audio/route.ts
src/app/api/prayers/vocal/consent/route.ts
src/app/api/sacred-annotations/route.ts
src/app/api/soul/route.ts
src/app/api/spiritual-companion/route.ts
src/app/api/rapport/religious-census/route.ts
src/app/api/admin/seed-camino/route.ts
src/app/api/admin/seed-officiants/route.ts
src/app/api/admin/seed-religious-events/route.ts
src/app/api/admin/ai/soul/generate/route.ts
```

### A.3 Composants React (~10)
```
src/components/CaminoClient.tsx
src/components/CerclesPriereLive.tsx
src/components/ChampDePriereClient.tsx
src/components/CompagnonSpirituelClient.tsx
src/components/OfficiantsClient.tsx
src/components/PrayerChatClient.tsx
src/components/SacredSkyline.tsx
src/components/prayers/JournalClient.tsx
src/components/prayers/VocalPrayerCard.tsx
src/components/prayers/VocalPrayerRecorder.tsx
```
(et le dossier `src/components/prayers/` entier)

### A.4 Lib utilities (1)
```
src/lib/vocal-prayer-transcribe.ts
```

### A.5 Documents racine (10)
```
PLAN_LIEUX_SAINTS_FETES_RELIGIEUSES.md
IDEES_SPIRITUEL_VIRTUEL.md
EVALUATION_ET_PLAN_IA_LOCALE_2026-05-06.md
RAPPORT_AUDIT_GLD_2026-05-04.md
RAPPORT_AUDIT_GLD_2026-05-06.md
RAPPORT_GLD_4MAI2026.pdf
SCREENSHOTS_LIBRARY_2026-05-06.md
SESSION_RECAP_2026-05-06.md
PLAN_PROJET_GodLovesDiversity.md
God Loves Diversity.docx
A3  GOD AFFICHE 2025.pdf
cbc1c5c0-3447-4105-9fde-02d480721dac.png
```

**TOTAL DELETE : ~50 fichiers**

---

## 🔄 B. Fichiers à TRANSFORMER (renaming + rewrite)

### B.1 Modèles Prisma à supprimer du `schema.prisma`
```
PrayerMessage           ❌ supprimer
PrayerCandle            ❌ supprimer
PrayerIntention         ❌ supprimer
PrayerPresence          ❌ supprimer
VocalPrayer             ❌ supprimer
SoulEntry               ❌ supprimer
SacredAnnotation        ❌ supprimer
CaminoPath              ❌ supprimer
CaminoStep              ❌ supprimer
Officiant               🔄 renommer en Asso (association LGBT)
SeedReligiousEvent      ❌ supprimer
HolidayCalendar (model) 🔄 garder mais purger les fêtes religieuses, ajouter Pride/Marches/Existrans
User.vocalPrayers       ❌ retirer la relation
User.vocalPrayerConsent ❌ retirer
```
**Migration Prisma** : `lgbt_refonte_v1_purge_religious` qui supprime ~9 tables.

### B.2 Composants Avatar (renommage `AskGld` → `AskAssistant`)
```
src/components/AskGldAvatar.tsx           → AskAssistantAvatar.tsx
src/components/AskGldAvatarLive.tsx       → AskAssistantAvatarLive.tsx
src/components/AskGldAvatarLiveAvatar.tsx → AskAssistantAvatarLiveAvatar.tsx
src/components/AskGldAvatarLocal.tsx      → AskAssistantAvatarLocal.tsx
src/components/AskGldWidget.tsx           → AskAssistantWidget.tsx
src/components/admin/AvatarStudio.tsx     → réécriture prompts LGBT
```

### B.3 i18n complet (4 fichiers JSON)
```
src/messages/fr.json   → réécriture intégrale (97 lignes)
src/messages/en.json   → idem
src/messages/es.json   → idem
src/messages/pt.json   → idem
```
Sections actuelles à réécrire : `nav`, `home`, `footer`, `participate`, `gallery`, `posters`, `newsletter`, `about`, `message`, `argumentaire`, `common`.

### B.4 Lib AI (prompts à réécrire)
```
src/lib/ai.ts                  → 12 refs religieuses → réécriture
src/lib/gemini.ts              → réécriture system prompt
src/lib/ai-autopilot.ts        → idem
src/lib/holiday-calendar.ts    → garder fêtes civiles + Pride, supprimer religieuses
src/lib/seo.ts                 → 11 refs religieuses
src/lib/connect-mock.ts        → 17 refs (profils mock religieux)
```

### B.5 Layout & navigation
```
src/app/[locale]/layout.tsx              → menu nav purgé
src/components/admin/SettingsForm.tsx    → 13 refs
src/components/admin/AIStudio.tsx        → 13 refs (prompts religieux)
src/components/VenuesDirectory.tsx       → 16 refs (catégories venues "églises…")
```

### B.6 Configuration projet
```
package.json              "name": "godlovesdiversity" → "parislgbt-platform"
README.md                  réécriture
.env.example              GLD → LGBT, godlovesdiversity → parislgbt
docker-compose.yml         service names + volume names
docker-compose.dev.yml    idem
Dockerfile                comments
prisma/seed.ts            seed religieux → seed Pride/lieux LGBT
public/posters/           supprimer les affiches religieuses → upload futures pride
```

### B.7 Cron jobs à adapter
```
src/app/api/cron/classify-venues/route.ts  → 16 refs (classification religieuse)
src/lib/webcam-sources.ts                   → 20 refs (webcams lieux saints)
```

**TOTAL TRANSFORM : ~60-70 fichiers**

---

## ➕ C. Fichiers à AJOUTER (nouveaux pour LGBT)

### C.1 Pages publiques nouvelles (8)
```
src/app/[locale]/pride/page.tsx
src/app/[locale]/pride/[slug]/page.tsx
src/app/[locale]/soirees/page.tsx
src/app/[locale]/identites/page.tsx
src/app/[locale]/sante/page.tsx
src/app/[locale]/assos/page.tsx
src/app/[locale]/manifeste/page.tsx       (remplace /message)
src/app/[locale]/tech/page.tsx            (open source / contribuer)
src/app/[locale]/villes/[city]/page.tsx   (replace /gld-local/[city])
```

### C.2 Modèles Prisma nouveaux
```
model Identity { id, slug, label_i18n, flag, order }      // gay, lesbian, bi, trans, nb, queer, ace, pan, intersex
model PrideEvent { ...extends Event with pride-specific fields }
model HealthResource { ... PrEP, dépistage, médecins LGBT-friendly }
```

### C.3 Lib nouveaux
```
src/lib/scope.ts                   → multi-domaines paris/france
src/lib/pride-calendar.ts          → calendrier Pride 2026 (Marche Paris, Existrans, Lyon, Marseille, etc.)
src/lib/identity-flags.ts          → SVG drapeaux (rainbow, trans, bi, lesbian, ace, pan, nb, intersex, progress)
src/lib/lgbt-glossary.ts           → glossaire identités/orientations
```

### C.4 Middleware
```
src/middleware.ts                  → détection hostname → SITE_SCOPE
```

---

## 🧠 D. Stratégie de commits

```
git checkout --orphan main-archive
git commit -am "archive: god-loves-diversity v1 final state (b421449)"
git tag archive/god-loves-diversity-2026-05-07

git checkout -b feat/lgbt-refonte-c

# Phase 1 — Purge
1. chore: gitignore cleanup + LGBT docs added
2. chore: rename package godlovesdiversity → parislgbt-platform
3. chore: delete religious pages (11 files)
4. chore: delete religious API routes (~17 files)
5. chore: delete religious components (~10 files + dossier prayers/)
6. chore: delete vocal-prayer-transcribe lib + obsolete root MD/PDF
7. chore: rename AskGld* components → AskAssistant*
8. feat: prisma migration purge_religious_models (drop 9 tables)
9. feat: rewrite seed.ts (Pride 2026 + 50 lieux Paris/France)
10. feat: rewrite ai.ts gemini.ts prompts (LGBT-friendly)
11. feat: rewrite holiday-calendar.ts (Pride dates)
12. feat: rewrite i18n FR + EN
13. chore: docker/env rename gld→lgbt
14. feat: middleware multi-domaines + lib/scope.ts
15. feat: identity-flags lib + drapeaux SVG
16. feat: new pages (pride, soirees, identites, sante, assos, manifeste, tech, villes)
```

Chaque commit reste atomique et reversible.

---

## ⚠️ E. Risques détectés

| # | Risque | Mitigation |
|---|---|---|
| 1 | Cascade Prisma : suppression de tables impacte routes existantes | Audit des imports avant chaque DROP |
| 2 | i18n : 4 langues à réécrire = traductions manquantes | Garder FR+EN strict en V1, ES/PT en stub auto-traduit |
| 3 | Le composant `AskGldWidget` est probablement utilisé partout | grep -r refactor + alias temporaire |
| 4 | Docker volume `godlovesdiversity` contient peut-être des photos en dev → recréer volume `parislgbt` propre | docker compose down -v puis up |
| 5 | Le seed religieux a peut-être des entries en BDD → reset complet en V1 | `npx prisma migrate reset --force` au boot du nouveau projet |
| 6 | Routes API supprimées peuvent être référencées par des liens en composants | grep -r usage avant chaque DELETE |
| 7 | Les images affiches `A3 GOD` sont sûrement référencées dans posters/banner | nettoyer la table Banner et public/posters |

---

## ✅ F. Plan de validation user

Avant de lancer la purge, j'ai besoin de **3 confirmations** :

| # | Question | Reco |
|---|---|---|
| F1 | OK pour supprimer les **~50 fichiers listés en A** ? | Oui |
| F2 | OK pour la migration Prisma qui **drop 9 tables religieuses** (PrayerMessage, PrayerCandle, PrayerIntention, PrayerPresence, VocalPrayer, SoulEntry, SacredAnnotation, CaminoPath, CaminoStep) ? | Oui |
| F3 | Je commence la purge **directement dans la branche `feat/lgbt-refonte-c`** sur ton dossier desktop, ou je veux que tu valides chaque commit avant push ? | Direct + je résume après chaque batch |

---

## 📦 G. État après Phase 1 attendu

- **0 fichier** contenant les regex religieux strict (god, dieu, divin, religion, prière, sacré, verset, officiant, camino, etc.)
- **package.json** = `parislgbt-platform`
- **Schéma Prisma** = -9 tables religieuses, +1 table Identity
- **i18n FR** = 100% LGBT (no Dieu, no foi, no religion)
- **Code build** sans erreur (`npm run build` OK)
- **~50 fichiers supprimés**, **~70 fichiers modifiés**, **~10 fichiers ajoutés**
- **Diff approximatif** : -8 000 / +3 000 LOC

→ Prêt pour Phase 2 (multi-domaines).

---

**🚦 Dis-moi GO et je lance le commit `archive` puis la branche `feat/lgbt-refonte-c` immédiatement.**
