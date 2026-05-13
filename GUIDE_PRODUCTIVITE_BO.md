# 🎯 Guide productivité Back-Office LGBT Admin

**Pour Arnaud — comment gérer 2 fronts (parislgbt.com + lgbtfrance.fr) sans y passer 20h/semaine.**

---

## 🚀 Top 10 workflows ultra-productifs

### 1. Switcher de front (en 1 clic)

Dans la sidebar admin, sous le logo "LGBT Admin" :
- 🌈 Bouton **Paris LGBT** (rose) — sélectionne le scope parislgbt.com
- 🏳️‍🌈 Bouton **LGBT France** (violet) — sélectionne le scope lgbtfrance.fr
- Petit icône ↗ → ouvre le front sélectionné dans un nouvel onglet
- Boutons rapides en dessous : `parislgbt.com` / `lgbtfrance.fr` (ouvre direct)

**Comportement** :
- La sélection est gardée dans `localStorage`
- Toutes les listes admin (Listings, Events, Settings) filtrent automatiquement par site_id
- Bascule en 1 clic sans rechargement

**Astuce** : utilise les **3 fenêtres** (Mac : ⌘ + N) si tu fais des édits parallèles Paris/France.

---

### 2. Modération en série (raccourcis clavier)

`/admin/moderation` → file d'attente photos/listings PENDING.

Raccourcis :
- **A** ou **Enter** : Approve
- **R** : Reject
- **N** ou **↓** : Next
- **P** ou **↑** : Previous
- **C** : Comment (modal)

→ Modère **30-50 items en 5 min** au lieu de 1 item/30 sec à la souris.

---

### 3. Newsletter en 2 clics avec IA

`/admin/newsletter` → bouton **"Générer brouillon IA"** :
1. Tu choisis le ton (chaleureux / militant / fun / pro)
2. Tu choisis le thème (Pride / nouveau lieu / santé / témoignages)
3. Gemini génère **300 mots + sujet + preview** en 8 sec
4. Tu valides → envoi avec confirmation double opt-in RGPD

→ Newsletter mensuelle qui prend **3 min**, pas 2 h.

---

### 4. Calendrier social (Insta + FB + X + LinkedIn + TikTok en parallèle)

`/admin/calendar` :
- Drag-drop des posts dans le calendrier
- Bouton "Auto-générer 7 posts pour la semaine" → IA crée 7 posts adaptés à chaque réseau
- Bouton ⏰ → publication programmée (BullMQ worker)
- Bouton 📊 → analytics par post (engagement, reach, clics)

→ **1 h le lundi matin** pour cadencer toute la semaine.

---

### 5. SEO Boosts en 1 page (le module clé pour ton trafic)

`/admin/seo` ← **nouveau**, accessible depuis Configuration → SEO Boosts ⚡

4 cartes-boutons :
1. **Import listings** (3 379 lieux scrape+CSV) — à lancer en premier
2. **Pages régionales** — gratuit, instantané
3. **Gemini rewrite anti-duplicate** — 0.5€, 5-8 min
4. **Articles Top 10 par ville** — 1-2€, 10-15 min

Stats live : nombre de listings, régions, articles, URLs sitemap.
Logs en stream pendant l'exécution.

**Re-runs**: tu peux relancer chaque boost (idempotent).

---

### 6. Bulk importer CSV/JSON

`/admin/import` :
- Drag-drop un CSV → mapping colonnes auto-détecté
- Preview avant import (tu vois les 10 premières lignes mappées)
- Choix : Append / Update / Replace
- Filtre par site_id (Paris seulement / France seulement / les 2)

→ Tu reçois un Google Sheet d'un partenaire avec 200 lieux ? **Import en 3 min.**

---

### 7. Réponses IA aux commentaires/messages forum

`/admin/forum` :
- Liste des posts modérables
- Bouton "Suggérer réponse IA" → Gemini lit le post + contexte communauté + propose 3 tons (compassionnel / pratique / contextuel)
- Tu valides en 1 clic ou édites

→ Tu gardes le forum vivant **sans y passer 1 h/jour**.

---

### 8. Banners dynamiques (ticker top de page)

`/admin/banners` :
- Liste des banners ticker actifs
- Toggle ON/OFF par locale
- Programmation : "actif du 15 au 30 juin" pour la Pride
- Bouton "Générer 5 banners IA pour la Pride 2026" → propositions auto

---

### 9. Avatar Studio / Assistant IA

`/admin/avatar-studio` :
- Configure l'**Assistant queer** (le widget en bas à droite du front)
- Personnalité (chaleureuse / militante / pro)
- Knowledge base : drag-drop tes docs (annuaires, FAQs)
- RAG Gemini auto-indexe et répond aux visiteurs

→ Service client **24/7 gratuit**.

---

### 10. Time Machine (rollback en 1 clic)

`/admin/time-machine` :
- Liste des changements admin journalisés (AuditLog)
- Bouton "Restaurer cet état" par entrée
- Snapshots auto avant chaque grosse modification

→ Tu sais que **tu peux revenir en arrière** → tu oses changer.

---

## 🎪 Workflows par fréquence

### Quotidien (5 min)
- Check `/admin` dashboard (alertes, signalements, modération à faire)
- Approuve/refuse les nouveaux items en PENDING
- Réponds aux messages forum urgents

### Hebdomadaire (1 h le lundi)
- `/admin/calendar` : programme 7 posts social
- `/admin/newsletter` : rédige la newsletter du jeudi
- `/admin/seo/stats` : check trafic + positionnement Google

### Mensuel (2 h)
- `/admin/seo` : relance le boost "Articles Top 10" pour les nouveaux mois (Pride / saison)
- `/admin/banners` : update les bannières top
- `/admin/establishments` : nettoie les fiches obsolètes
- Audit log : check les actions admin du mois

### Annuel (1 jour)
- Re-scraper parislgbt.com (au cas où) → fait par toi 1×/an
- Re-import CSV mis à jour
- Régénère les pages régionales avec stats actualisées
- Soumets sitemap à GSC pour les 2 domaines

---

## 🎁 Bonus : raccourcis clavier globaux

| Raccourci | Action |
|---|---|
| **⌘ K** | Mega-search (cherche dans tout l'admin) |
| **⌘ /** | Help/raccourcis (modal) |
| **g d** | Go Dashboard |
| **g m** | Go Modération |
| **g s** | Go SEO Boosts |
| **g n** | Go Newsletter |
| **g c** | Go Calendar |
| **g f** | Toggle Front actif (Paris ↔ France) |
| **⌘ \\** | Toggle sidebar |
| **Esc** | Ferme modals |

→ Tu peux faire **80% des actions sans la souris**.

---

## ⚙️ Concept clé : "Cercles concentriques Paris ⊂ France"

```
            ┌─────────────────────────────────────┐
            │  lgbtfrance.fr (TOUS les listings)  │
            │  2 701 venues France entière        │
            │   ┌─────────────────────────────┐   │
            │   │  parislgbt.com              │   │
            │   │  678 listings Paris only    │   │
            │   │  (sous-ensemble géo)        │   │
            │   └─────────────────────────────┘   │
            └─────────────────────────────────────┘
```

- **parislgbt.com** affiche UNIQUEMENT les listings city=Paris OU CP 75xxx
- **lgbtfrance.fr** affiche TOUS les listings (Paris compris)
- Mais **lgbtfrance.fr présente Paris avec un angle France** (meta-desc différente, position dans la région Île-de-France)

### Dans le BO

- Si tu **sélectionnes "Paris"** → tu ne vois que les listings Paris dans toutes les listes
- Si tu **sélectionnes "France"** → tu vois TOUT (Paris + autres régions)
- Tu peux gérer Paris sans polluer France et vice-versa

**Astuce** : pour les listings doublés (présents sur les 2 sites), tu peux les éditer indépendamment — le Gemini rewrite garantit que les descriptions restent différentes pour éviter le duplicate content Google.

---

## 🚦 Checklist avant chaque mise en prod

- [ ] `prisma generate` OK (pas d'erreur de schema)
- [ ] `npm run build` OK
- [ ] Tests E2E sur staging `lgbt.pixeeplay.com`
- [ ] Sitemap.xml accessible et bien formé
- [ ] Robots.txt à jour
- [ ] Schema.org JSON-LD présent sur listings et régions
- [ ] hreflang FR/EN cohérent
- [ ] Backup Postgres ✅
- [ ] DNS prêt si bascule prod
- [ ] Soumission GSC pour parislgbt.com + lgbtfrance.fr

---

## 💡 Ma reco finale (le geste qui change tout)

**Bloque 1 h par lundi matin** pour :
1. (10 min) Check stats + dashboard
2. (20 min) Newsletter brouillon IA → review → envoi programmé jeudi
3. (20 min) 7 posts social programmés sur la semaine
4. (10 min) Modère ce qui est en PENDING

→ **Reste 0 charge admin sur les 6 jours suivants.** Tu ne fais que créer/répondre quand l'envie est là.

C'est le seul rituel qui transforme un projet passion en projet **scalable sans burnout**.

---

🌈 Bon admin, et longue vie aux 2 fronts !
