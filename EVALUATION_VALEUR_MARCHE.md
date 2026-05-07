# 💰 Évaluation valeur marché — parislgbt.com / francelgbt.com

**Date :** 7 mai 2026
**Pour :** Arnaud (arnaud@gredai.com)
**Méthodes utilisées :** coût de remplacement · approche actif · multiples SaaS · comparables marché LGBT · valeur stratégique des domaines

---

## 🎯 TL;DR — fourchettes de prix selon état

| État de la plateforme | Valeur basse | Valeur haute | Acheteur cible |
|---|---|---|---|
| **En l'état (GLD religieux, 0 traffic)** | **15 000 €** | **40 000 €** | Asset code seul, repreneur tech |
| **Refondue LGBT, prête à lancer (Scénario C, 0 traffic)** | **60 000 €** | **150 000 €** | Asso LGBT, entrepreneur queer, agence média |
| **Refondue LGBT + domaines premium acquis** | **80 000 €** | **180 000 €** | Idem + valeur SEO domaines |
| **Refondue + 6 mois de traction (1k+ users actifs, qq abonnés premium)** | **150 000 €** | **400 000 €** | Investisseur tech, fonds early-stage |
| **Plateforme établie (10k+ MAU, MRR 5k+ €)** | **500 000 €** | **2 000 000 €** | Acquisition stratégique, concurrent international |
| **Marché matures (50k+ MAU, MRR 30k+ €)** | **2 M€** | **8 M€+** | Hornet/Grindr/Romeo type, fonds VC |

---

## 1. Méthode 1 — Coût de remplacement (le plus solide en B2B)

> Combien coûterait à un acheteur de **refaire ce code en partant de zéro** avec une agence ou freelances seniors ?

### 1.1 Inventaire de la valeur technique

| Composant | LOC ou unités | Heures dev équivalentes |
|---|---|---|
| **Codebase TS/TSX** | 72 025 LOC | ~1 200-1 800 h (40-60 LOC/h dev senior soutenu) |
| **Schéma Prisma** | ~70 modèles, 1 965 lignes | inclus ci-dessus + 40 h archi |
| **Routes API** | ~250 routes | inclus |
| **Pages publiques + admin** | ~134 pages | inclus |
| **Modules métier complets** | 15 modules majeurs | voir ci-dessous |
| **Setup Docker / CI / Coolify** | 1 stack prod-ready | 30 h |
| **i18n FR/EN/ES/PT** | 4 langues | 20 h |
| **Tests + debug + QA** | (estimé) | 200 h |
| **TOTAL refaire from scratch** | | **1 500 - 2 100 heures** |

### 1.2 Modules métier à valoriser séparément

Chaque module ci-dessous = un mini-produit qu'on achèterait séparément :

| Module | Heures dev solo | Coût agence (×3) |
|---|---|---|
| Auth (NextAuth + magic link + SMS + 2FA TOTP) | 60 h | 18 000 € |
| CMS pages/articles/banners/menu/themes | 80 h | 24 000 € |
| **Galerie photos + modération + EXIF** | 50 h | 15 000 € |
| **Newsletter (double opt-in RGPD + campagnes + IA brouillon)** | 70 h | 21 000 € |
| **Calendrier social multi-réseaux (Insta/FB/X/LinkedIn/TikTok + BullMQ)** | 100 h | 30 000 € |
| Carte interactive (Leaflet + clusters + filtres + Mapbox) | 50 h | 15 000 € |
| **Connect (Tinder-like : profils, swipe, matches, messages, premium Stripe, modération)** | **180 h** | **54 000 €** |
| **Forum complet (catégories, threads, posts, modération)** | 60 h | 18 000 € |
| **Boutique (produits, panier, checkout Stripe, dropshipping, coupons, loyalty, shipping Sendcloud)** | **150 h** | **45 000 €** |
| Témoignages vidéo + transcription | 40 h | 12 000 € |
| **Studio IA Gemini (textes + images + RAG + knowledge base)** | 80 h | 24 000 € |
| Avatar IA live (HeyGen + LiveKit) | 80 h | 24 000 € |
| Voice coach (utile trans) | 40 h | 12 000 € |
| Webcams live (sources + résolveur) | 40 h | 12 000 € |
| Telegram bot + AI router | 50 h | 15 000 € |
| Mentor / sessions | 30 h | 9 000 € |
| Voyage-safe (risk-countries) | 20 h | 6 000 € |
| SOS + helplines + emergency | 30 h | 9 000 € |
| Aide juridique | 20 h | 6 000 € |
| Espace pro (B2B venues + Facebook sync) | 60 h | 18 000 € |
| Endpoint mobile + branding API | 30 h | 9 000 € |
| Admin BO complet (~80 sous-routes) | 200 h | 60 000 € |
| **TOTAL en valeur agence** | **1 460 h** | **438 000 €** |

### 1.3 Valeur de remplacement consolidée

| Mode | Tarif horaire | Total |
|---|---|---|
| Freelance senior solo (~70 €/h) | 70 € × 1 800 h | **126 000 €** |
| Agence française (TJM 700 €) | 700 € × 240 j | **168 000 €** |
| Agence parisienne premium (TJM 1 200 €) | 1 200 € × 240 j | **288 000 €** |
| Agence internationale type Theodo / Padok | 1 500-2 000 € × 240 j | **360 000-480 000 €** |

> **🎯 Point d'ancrage** : refaire from scratch coûterait **120 k€ minimum** en freelance et **300-450 k€** en agence. C'est le **plancher de négociation** pour un acheteur rationnel.

---

## 2. Méthode 2 — Approche "asset" (marketplace style Flippa)

> Sur les marketplaces de revente de sites (Flippa, Empire Flippers, Acquire.com), on multiplie le revenu net mensuel.

### 2.1 Sans traffic ni revenu

- Valeur asset code seul = **30-40 % du coût de remplacement** (acheteur prend le risque tech)
- Soit **40 000 - 70 000 €** pour la version refondue LGBT, livrable et déployée

### 2.2 Avec traffic mais peu de revenu

- Sites SaaS pré-revenue : **2-5 € par utilisateur actif mensuel**
- 5 000 MAU = **10 000-25 000 €** de "user base value" qui s'ajoute à l'asset

### 2.3 Avec MRR (Monthly Recurring Revenue) Premium

- Multiples Flippa pour SaaS/membership :
  - **24-36× MRR** pour SaaS croissant (>20 % YoY)
  - **40-60× MRR** pour SaaS rentable & stable
- Un MRR de 5 000 €/mois = **120 000-180 000 €**
- Un MRR de 30 000 €/mois = **720 000-1 080 000 €**

---

## 3. Méthode 3 — Comparables marché LGBT/queer

### 3.1 Acquisitions notables dans le secteur

| Plateforme | Type | Valorisation / Vente | Commentaire |
|---|---|---|---|
| **Misterb&b** | Airbnb gay (hébergement) | Levée ~10 M$ + acquis Hooly | Niche premium queer = valuable |
| **Hornet** | App rencontres gay (~25M users) | Valorisé 100M+ $ | Leader marché |
| **Grindr** | App rencontres gay (~13M users) | Coté Nasdaq, market cap ~2 Mds$ | Référence absolue |
| **Romeo (PlanetRomeo)** | App rencontres gay | Acquis par société FR | Leader européen |
| **Tagg / HER** | App lesbiennes/queer | Levées 10-15 M$ | |
| **Out Magazine** | Média US LGBT | Acquis par Pride Media (~50M$) | Média indépendant LGBT vendu |
| **PinkNews** | Média UK | ~£10M ARR | Média référence |
| **MyLGBT.life** | Annuaire/community FR | Privé | Comparable direct |

### 3.2 Le marché "Pink Economy"

- **Pouvoir d'achat LGBT mondial** : ~ 4 700 milliards $ /an
- **Marché LGBT France** : estimé 30-40 milliards € de pouvoir d'achat annuel
- Communauté FR : ~3,5-5 M de personnes s'identifiant LGBT+
- Tourisme LGBT FR : ~5-7 milliards €/an
- Croissance secteur tech LGBT : +12-15 %/an

### 3.3 Domaines premium

| Domaine | Statut à vérifier | Valeur estimée si acquis |
|---|---|---|
| **parislgbt.com** | Possédé par toi ? | 5 000-15 000 € (premium .com niche) |
| **francelgbt.com** | À vérifier | 5 000-15 000 € si dispo, plus si à racheter |
| **lgbt.fr** | Probablement pris | 30-100 k€ si négociable |
| **gayparis.com** | Pris (depuis longtemps) | 50-200 k€ |

> **Si tu détiens déjà parislgbt.com et francelgbt.com**, ça ajoute **10-30 k€** de valeur immédiate à la cession.

---

## 4. Méthode 4 — Valeur stratégique (pour acquéreur sectoriel)

> Combien un acteur du marché LGBT (asso, média, app de rencontre) **paierait pour mettre la main dessus** rapidement plutôt que de construire ?

### Acheteurs probables par profil

| Profil | Intérêt | Prix qu'ils peuvent payer |
|---|---|---|
| **Centre LGBT Paris / Inter-LGBT / SOS Homophobie** | Outil tech complet pour la communauté | 30-80 k€ (budgets associatifs) |
| **App rencontre LGBT** (Hornet, Romeo, Taimi) | Acquisition geo France pour étendre features locales | 200-500 k€ |
| **Média LGBT** (Têtu, Komitid) | Plateforme tech pour pivoter vers événementiel + community | 100-300 k€ |
| **Voyage LGBT** (Misterb&b, OutOfOffice) | Annuaire lieux + community en France | 150-400 k€ |
| **Marque pride / merch** | Boutique + audience captive | 80-200 k€ |
| **Investisseur indépendant queer** | Project to grow | 40-150 k€ |
| **Concurrent local naissant** | Éliminer un compétiteur prêt à lancer | 60-180 k€ |

---

## 5. Synthèse — Quel prix demander ?

### Si tu veux **vendre rapidement** la plateforme refondue LGBT

| Cas | Prix d'asking | Prix probable de closing |
|---|---|---|
| Code seul, pas de domaine | 80 000 € | 50-65 000 € |
| Code + 2 domaines (parislgbt.com, francelgbt.com) | 120 000 € | 75-90 000 € |
| Code + domaines + déployé sur Coolify (lgbt.pixelplay.com) running | 140 000 € | 85-110 000 € |
| Code + domaines + 100 contenus seed (lieux, événements, articles) | 180 000 € | 120-150 000 € |

### Si tu veux **construire la valeur** avant de vendre

**Plan en 3 étapes** :
1. **Refonte (1 mois)** → valeur intrinsèque code passe de 30 k€ à 100 k€
2. **Soft launch + traction (6 mois)** → 2-5 k MAU, 50-200 abonnés premium → valeur 200-400 k€
3. **Croissance (12-18 mois)** → 10-30 k MAU, 500-2 000 abonnés premium = MRR 5-25 k€ → **valeur 300 k€ à 1,5 M€**

ROI : injecter ~30 k€ de marketing/acquisition après refonte peut multiplier la valeur ×5-10.

---

## 6. Facteurs qui **augmentent** la valeur

✅ Les 2 fichiers `lgbt-helplines.ts` + `risk-countries.ts` déjà LGBT — montre la roadmap
✅ Module Connect complet et moderne (rare dans annuaires LGBT classiques)
✅ Stack 2026 (Next.js 14, React 18, Prisma 5, Tailwind, IA Gemini intégrée)
✅ Multi-domaines paris/france dans un seul code = scalable
✅ i18n 4 langues = expansion EU possible
✅ 210 commits sur 1 mois = vélocité prouvée
✅ Toute la plomberie est faite : auth, paiement, mail, social, IA, storage, queue
✅ Endpoint mobile prêt = app Expo facile à brancher en V2

## 7. Facteurs qui **diminuent** la valeur (pour le moment)

❌ 0 trafic réel
❌ 0 utilisateur actif
❌ 0 contenu seed (lieux/événements LGBT) — il faut tout remplir
❌ 368 fichiers à dépolluer du contenu religieux
❌ Pas de tests automatisés (à confirmer)
❌ Code écrit en 1 mois = dette technique probable, refacto nécessaire
❌ Dépendance à un seul dev (toi) — bus factor = 1
❌ Pas de marque établie, pas de presse, pas de SEO
❌ Tracking RGPD à valider strictement (LGBT = données sensibles)
❌ Modération communautaire pas encore éprouvée sur du vrai trafic

---

## 8. Recommandations stratégiques

### Si l'objectif est de **vendre rapidement** (cash-out)

1. **Faire la refonte LGBT** (Scénario C — 140-180 h) → valeur immédiate +50-80 k€
2. **Acquérir parislgbt.com + francelgbt.com** si pas déjà fait
3. **Seed 200-500 lieux** (Paris + 5 grandes villes France) via scraping ou base ouverte → ajoute ~15 k€ de valeur
4. **Déployer sur Coolify** + domaines actifs + HTTPS → ajoute ~10 k€
5. Lister sur **Acquire.com / Flippa / MicroAcquire** + outreach à Têtu, Hornet, Misterb&b, Centre LGBT
6. **Asking : 120-180 k€** → closing probable **75-130 k€**

### Si l'objectif est de **construire un business** (long-term)

1. **Refonte LGBT + soft launch sur Paris** d'abord (Pride 2026 = jackpot timing si tu lances en mai-juin)
2. Acquisition utilisateurs ciblée (Insta + TikTok queer + assos partenaires) → 5-10 k€ marketing
3. Lancer **premium Connect** dès 1 000 users actifs → MRR de quelques milliers €
4. Étendre à France entière en mode auto-pub (~mois 6-9)
5. Levée de fonds early-stage à 1-2 M€ valorisation après 18 mois si traction OK
6. Exit possible à 5-15 M€ à 36-48 mois si croissance maîtrisée

### Si l'objectif est de **garder en passion project / B-corp**

1. Refonte LGBT, déploiement, **monter une asso loi 1901** propriétaire de la plateforme
2. Subventions Région IDF / Mairie Paris (programmes diversité) : **30-100 k€/an** disponibles
3. Mécénat de compétences (Adidas, BNP, Engie, Carrefour ont des programmes LGBT) : 50-150 k€/an
4. Valeur sociale > valeur monétaire, mais business model viable

---

## 9. Ma reco personnelle pour toi

> Tu as une **base technique** valant ~120-180 k€ sur le marché en l'état post-refonte LGBT. Mais sa **valeur stratégique réelle** (pour un acquéreur LGBT FR), si bien marketée, est plutôt **150-300 k€**.

**3 leviers à activer rapidement pour maximiser** :

1. **Pride 2026 timing** — la marche Paris est début juillet. Si on push très fort de mai à juillet, on peut capter le buzz et générer du trafic + presse gratuite. Multiplicateur de valeur immédiat.
2. **Pré-vendre des partenariats** — bars/clubs/assos LGBT en partenariat dès la sortie. 50 partenaires payants à 50 €/mois = 30 k€ MRR objectif M+12 = valeur +300 k€.
3. **Acquérir au moins 1 média** comme co-fondateur communication (Têtu, Komitid, Yagg) en échange d'equity — c'est 50 k€ de PR gratuite minimum.

---

## 10. Décisions ouvertes pour la valorisation

| # | Question | Pour orienter le pricing |
|---|---|---|
| V1 | Tu détiens **parislgbt.com** ? | Si oui +5-15 k€ valeur |
| V2 | Tu détiens **francelgbt.com** ? (ou il faut l'acheter ?) | Idem |
| V3 | Objectif final : **vendre** rapidement ou **exploiter** ? | Change toute la stratégie |
| V4 | Tu as un budget acquisition utilisateurs ? | Si oui : multiplicateur ×3-5 valeur en 6 mois |
| V5 | Tu acceptes equity / partenariat avec un média LGBT ? | Levier de valorisation rapide |
| V6 | Tu veux faire une asso loi 1901 pour ouvrir aux subventions ? | Modèle hybride viable |

---

**🌈 Verdict : ton projet vaut entre 60 k€ (asset code aujourd'hui) et 1,5 M€ (avec 18 mois de croissance). La refonte LGBT est l'**accélérateur de valorisation** le plus rentable — on parle d'un ROI de 3 à 8× sur ~150 h de travail.
