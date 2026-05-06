# 📸 Bibliothèque de screenshots — God Loves Diversity
**Capture du 6 mai 2026** · **Captured via Chrome MCP**

Cette bibliothèque référence l'état visuel du site à cette date pour usage dans les manuels et la documentation. Chaque screenshot est associé à une route et un état observé.

> **Note technique** : les fichiers JPEG ont été capturés via Chrome MCP avec `save_to_disk: true`. Les IDs internes sont conservés dans cette doc pour traçabilité. Une re-capture peut être déclenchée via `npm run capture-screenshots` (à venir) ou en relançant cette session.

---

## Site public

### 🏠 Accueil — `/`
- **Capture ID** : `ss_57111t1on`
- **Observé** : hero gradient violet-bleu-rose, ticker dons (5€/10€), barre comportant "Soutenez le mouvement / Chaque don fait la différence / Aidez-nous à diffuser l'affiche partout dans le monde", logo GLD avec cœur arc-en-ciel.
- **Carrousel actif** : 5 slides (indicateurs en bas), Section "Mouvement Interreligieux • 2026", titre "GOD LOVES DIVERSITY", citation "Dieu n'est pas opposé aux personnes LGBT...", 2 CTA "Comprendre le message" et "Voir les photos".
- **Navigation** : Le Message · Argumentaire · Affiches · Communauté · Agenda · Photos · Boutique + recherche ⌘K + admin
- **Bouton flottant** : SOS (rouge, en bas-gauche) · Demandez à GLD (rose, en bas-droite)

### 📍 Lieux LGBTQ+ — `/lieux`
- **Capture ID** : `ss_0022kp9ut`
- **Observé** : titre "Lieux LGBTQ+", description annuaire mondial, **400 résultats** affichés, vue carte par défaut activée, filtres Pays/Ville/Recherche
- **Sidebar liste** : "LE RESERVOIR (25)" Besançon · "Médecins LGBT-friendly" France · "HOT BOX" Trégueux
- **Carte interactive** : Leaflet avec markers personnalisés (logo des venues + emoji par type), 13 lieux affichés visibles, contrôles zoom + "Me localiser"
- **Filtres** : "Tous (400)", filtre "✨other"

### 📅 Agenda — `/agenda`
- **Capture ID** : `ss_3944duhlc`
- **Observé** : titre "Agenda", switch Liste/Calendrier, filtres Pays/Ville/Lieu + recherche
- **État actuel** : "0 évén." (aucun événement publié à ce jour) → CTA "Soumets-le" pour ajouter
- **Action utilisateur** : "Tu organises un événement LGBT-friendly ? Soumets-le."

### 💬 Forum — `/forum`
- **Capture ID** : `ss_7807woq8o`
- **Observé** : "Espaces de discussion thématiques pour la communauté GLD"
- **État actuel** : "Le forum se prépare. Les premières catégories seront bientôt ouvertes."
- **CTA** : bouton "Nouveau sujet" (rose) — actif mais sans catégories
- **Footer visible** : #GodLovesDiversity · Le mouvement · Ressources · Mon compte

### 🛍 Boutique — `/boutique`
- **Capture ID** : `ss_22906cfwf`
- **Observé** : titre "Boutique" multicolore arc-en-ciel, sous-titre "T-shirts, posters, mugs, livres et accessoires"
- **Produits visibles** : T-shirt arc-en-ciel "God Loves Diversity" 35€ · Bougie parfumée "Vitrail — Encens & Oud" · Mug céramique "Foi & Diversité" 17€ · Tote bag canvas "GLD" 15€
- **Catégories** : Vêtement, Accessoire (badges en haut des produits)

### 🖼 Galerie — `/galerie`
- **Capture ID** : `ss_97764lv6i`
- **Observé** : "GALERIE MONDIALE — Découvrez les photos partagées par la communauté"
- **Filtres** : Tout (actif) · Églises · Mosquées · Synagogues · Temples
- **Carte mondiale** : Europe centrée, point France visible
- **Grille photos** : visuels GLD (cœurs arc-en-ciel), photo "Paris", photos églises avec posters GLD (Helsinki, Florence, etc.)

### 📖 Argumentaire — `/argumentaire`
- **Capture ID** : `ss_410878cji`
- **Observé** : sous-titre "QUATRE VÉRITÉS SIMPLES", titre "L'argumentaire"
- **Description** : "Une lecture inclusive des textes sacrés repose sur quatre fondations solides..."
- **Section 1 visible** : "01. Dieu est amour universel — Les grandes religions monothéistes reposent sur l'amour, la compassion et la justice. Aucune condamnation explicite de..."

### 💌 Message — `/message`
- **Capture ID** : `ss_32585du15`
- **Observé** : "MANIFESTE — Le message"
- **Description** : "Dieu n'est pas opposé aux personnes LGBT. Ce rejet est le produit d'interprétations historiques et humaines des textes sacrés..."
- **Section visible** : "L'amour avant tout"

### 🆘 Urgence — `/urgence`
- **Capture ID** : `ss_7273di05x`
- **⚠️ BUG DÉTECTÉ** : page **noire entièrement** — la page ne se charge pas correctement (rendering vide)
- **Action requise** : investiger pourquoi la page urgence affiche du noir, c'est un module CRITIQUE (SOS LGBT 24/7)

### 🙏 Cercles de prière — `/cercles-priere`
- **Capture ID** : `ss_1042h1v9n`
- **Observé** : titre "Cercles de prière inclusifs", "7 communautés spirituelles LGBT-friendly se retrouvent en ligne"
- **6 cercles visibles** : Catholique inclusif (Mardi 20h CET, hôte David & Jonathan) · Protestant inclusif (Jeudi 20h CET, Carrefour des Chrétiens Inclusifs CCI) · Musulman·e LGBT (Vendredi 21h CET, HM2F) · Juif·ves LGBT (Vendredi soir avant Shabbat, Beit Haverim) · Bouddhiste·s LGBT (Dimanche 19h CET, Sangha Inclusive Européenne) · Hindou·es LGBT (Mercredi 20h CET, Réseau Galva-108)
- **7e cercle** : Inter-religieux (1er dim. du mois 17h CET)

### 🤝 Mentor — `/mentor`
- **Capture ID** : `ss_2763y7hwr`
- **Observé** : titre "Mentorat 1-1", "Matching anonyme jeune ↔ ainé·e LGBT pour 4 conversations Zoom (1h)"
- **Toggle** : "Je cherche un·e mentor·e" (actif) / "Je veux mentorer"
- **Form** : Pseudo · Email (pour le match) · Ton âge · Identité (libre, ex. gay, lesbienne, trans, non-binaire) · Sujets à aborder (coming-out, foi, famille, couple, trans, asile)

### ⭐ Membre+ — `/membre-plus`
- **Capture ID** : `ss_6493y7hb1`
- **Observé** : titre "⭐ Membre+", "Soutiens GLD à long terme. 4€/mois ou 40€/an"
- **2 plans visibles** : Mensuel 4€/mois · Annuel 40€/an (-17%)
- **Avantages listés** : Aucune publicité · Badge "Membre+" visible sur ton profil · Accès anticipé aux nouveaux événements (24h avant) · Statistiques perso (impact témoignages, partages, soutiens) · Bon de réduction 15% boutique GLD · Accès aux 50 thèmes saisonniers (sinon limité à 10) · Studio IA Pro illimité (sinon 10/mois)

### 🎥 Témoignages — `/temoignages`
- **Capture ID** : `ss_0293m5qzd`
- **Observé** : titre "Témoignages", "Voix authentiques de femmes et d'hommes — leur foi, leur diversité, leur cheminement. Sous-titres FR/EN/ES/PT générés automatiquement par IA"
- **État actuel** : "Les premiers témoignages arrivent bientôt." (placeholder)

### 📊 Rapport live — `/rapport`
- **Capture ID** : `ss_0186pye29`
- **Observé** : Hero noir "🌈 God Loves Diversity — Live · 6 mai 2026 à 12:41"
- **Description** : "Le réseau social inclusif religieux LGBT+ — données extraites de la base de production. Cette page se régénère à chaque visite et est rafraîchie toutes les 2h par un cron Claude."
- **Badges** : 2694 lieux · 3 membres · 10 langues · PWA + iOS natif
- **CTA** : Télécharger en PDF · Actualiser maintenant · Voir le site
- **Stats LIVE visibles** : 2694 lieux LGBT-friendly (54 géocodés, 2%) · 0 événements · 3 utilisateurs · 1 profil Connect · 3 posts Connect · 0 posts forum · 1 témoignage · 54 photos · 5 produits boutique · 4 commandes
- **⚠️ Note** : seuls 54/2694 (2%) lieux sont géocodés — chantier P1 confirmé dans l'audit

### 📋 Affiches — `/affiches`
- **Capture ID** : `ss_3978y2psk`
- **Observé** : titre "Téléchargez les affiches", sous-titre "Imprimez. Posez. Photographiez. Partagez."
- **1 affiche visible** : poster A4 "GOD" rose + cœur arc-en-ciel néon + "DIVERSITY" rose

### 🌐 Connect (réseau social) — `/connect/mur`
- **Capture ID** : `ss_8826krx0s`
- **Observé** : interface réseau social complète, header "GLD Connect" + recherche, 3 modes en haut (Communauté actif / Rencontres / Pro)
- **Sidebar gauche** : 🏠 Mon mur · 🤝 Cercles de prière (4) · 👥 Mes amis (47) · ✨ Groupes (12) · 📅 Événements (3) · 💖 Témoignages · 📷 Photos partagées · 💬 Messagerie · ⚙ Mon profil Connect
- **Composer** : "Partage un témoignage, une prière, une photo, un événement..." + 4 boutons (Photo/Vidéo · Événement · Sentiment · Demande de prière)
- **Premier post visible** : Marc-Antoine (Lyon, il y a 1j), badge "Témoignage", "Hier à la messe de St-Just on m'a demandé si je « priais pour ma guérison »..."
- **Sidebar droite** : Anniversaires (Sarah, 28 ans aujourd'hui) · Événements proches (Pride Lyon 14 juin, Veillée œcuménique 22 juin) · Suggestions (Marc-Antoine gay Lyon, Léa lesbienne Marseille, Sami gay Bordeaux)

### 🏥 Lieu détail (mini-site) — `/lieux/medecins-lgbt-friendly-`
- **Capture ID** : `ss_0156lw5z6`
- **Observé** : NOUVEAU layout mini-site avec hero gradient violet/bleu (banner SVG procédural — pas de coverImage)
- **Logo** : visible dans cercle arrondi (encore avec bug "DECI/-FRIEN" car le déploiement de mon fix n'était pas encore fini au moment de la capture)
- **Tabs** : Résumé (actif) · Infos (visibles, autres masqués car pas de photos/vidéos/events)
- **Section À propos** : "Réseau de 450 médecins et professionnels de santé gay friendly et LGBT"
- **Sidebar** : Contact rapide → Site web

---

## Admin / Coolify

### 🚀 Coolify — `/project/.../deployments`
- **Capture ID** : `ss_3911ggd4y` puis `ss_50928czdh` puis `ss_7478fbz67`
- **Observé** : 127 déploiements (page 1 of 13)
- **Statut current** : "Restarting (unknown) (23x restarts)" → bug d'application sous-jacent
- **Last in-progress** : commit `b01a092` "feat: fix manual gen reliability..."
- **Last success** : commit `678a837` "feat(newsletter): historique campagnes complet" (12 min ago, durée 5m17s)
- **Avant** : `30924ce` "fix(qr): remplace impl custom (incomplete Reed-Solomon) par lib"
- **Warning** : "The latest configuration has not been applied. Please redeploy to apply the new configuration."

### 📈 Audit live — `/api/rapport/audit` ✅
- **Capture ID** : `ss_2363wauze` (post-déploiement)
- **Observé** : Hero gradient violet/rose/orange, badge "Live · 6 mai 2026 à 12:45"
- **Score COMPLÉTION** : **83%**
- **77 modules audités** : 60 LIVE · 8 PARTIEL · 9 PLANIFIÉ · 0 CASSÉ
- **Catégories visibles** : Site public (9), Lieux, Événements, Communauté, Boutique, Newsletter, IA, Communication, Admin, SOS, Mobile, Infra, RGPD, Sécurité
- **CTA** : PDF · Refresh · Sécurité · Live

### 🔒 Sécurité live — `/api/rapport/securite` ✅
- **Capture ID** : `ss_26292mc5i` (post-déploiement)
- **Observé** : Hero violet/rose
- **Score GLOBAL** : **61%**
- **Compteurs** : 19 OK · 12 WARN · 0 FAIL
- **Section Transport (7)** : HTTPS forcé ✅, HSTS preload (1 an) ✅, CSP ✅, Permissions-Policy ✅, X-Frame-Options DENY ✅
- **Plan d'action sécurité** prioritaire affiché en bas

### 🏥 Lieu détail (mini-site) — Re-capture après deploy
- **Capture ID** : `ss_1428is7vk`
- **🎉 LOGO FIX CONFIRMÉ** : le logo "MEDECINS LGBT-FRIENDLY" s'affiche maintenant CORRECTEMENT (object-contain + bg blanc, plus de "DECI/-FRIEN" cropping)
- **VenueBanner SVG procédural** : visible avec sparkle pattern teal/cyan (type Health) — fallback élégant quand pas de coverImage
- **Tabs** : Résumé · Infos
- **À propos** : "Réseau de 450 médecins et professionnels de santé gay friendly et LGBT"
- **Sidebar Contact rapide** : bouton Site web ✓

---

## Constat important — bugs à corriger après cette capture

| Page | Status | Action |
|---|---|---|
| `/urgence` | ❌ Black screen | Investigater rendu vide — module CRITIQUE SOS |
| `/lieux/medecins-lgbt-friendly-` | 🟡 Logo encore croppé | Fix `object-contain` déployé en cours (b01a092) |
| `/api/rapport/audit` | ⏳ Pas encore déployé | Attendre fin build b01a092 |
| `/api/rapport/securite` | ⏳ Pas encore déployé | Attendre fin build b01a092 |
| App globale | ⚠️ 23x restarts | Investiger via Coolify Logs |

---

### 🛠 Admin Tableau de bord — `/admin`
- **Capture ID** : `ss_3328cefa6`
- **Observé** : "Tableau de bord — Bienvenue, Admin · mercredi 6 mai 2026"
- **KPIs Boutique & Ventes** : 4 commandes total · 1 payée · 1 expédiée · 108 € CA · 5 produits actifs
- **KPIs Audience** : 330 vues totales · 330 vues 7j · 330 vues 30j · 1 abonné newsletter
- **Mini-graph** "Visites · 7 derniers jours" Total: 330
- **KPIs Photos** : 2 photos en modération · 51 publiées · 54 contributions · 0 posts programmés
- **Sidebar** : Tableau de bord · Espace Pro · Boutique (Produits/Commandes/Dropshipping) · Contenu · Communication · Connect · IA & Outils · Système

### 🏢 Admin Pro Venues (NOUVEAU) — `/admin/pro/venues`
- **Capture ID** : `ss_0920pedsr`
- **🎉 NOUVELLE PAGE QUE J'AI CRÉÉE** : visible et fonctionnelle
- **En-tête** : "Mes lieux · vue super-admin · ← retour Espace Pro · page publique /lieux · + Nouveau lieu"
- **7 stats globales** : 500 TOTAL · 6 ENRICHIS · 500 PUBLIÉS · 0 FEATURED · 0 EVENTS · 0 COUPONS · 0% FRAÎCHEUR ⌀
- **Toolbar** : recherche "un lieu, une ville, un tag…" + bouton "Tout sélectionner"
- **Filtres** : "Tous (500)" · "OTHER (500)"
- **3 cards visibles** : LE RESERVOIR (25, Besançon, 75% freshness, ✨ IA), Médecins LGBT-friendly (France, 27% freshness, ✨ IA), LE CODE (06, Nice, ✨ IA)
- **Actions par card** : Éditer (pink) · IA enrich (purple) · Calendar (cyan) · External link (emerald) · Delete (rose)
- **Warning** : "Pas de photo : améliore le score IA"

### 📧 Admin Newsletter — `/admin/newsletter`
- **Capture ID** : `ss_5997f5k11`
- **Observé** : "Newsletter — Gère tes abonnés, compose et envoie tes campagnes"
- **4 KPIs abonnés** : 1 ACTIF · 0 EN ATTENTE · 0 DÉSINSCRITS · 0 BOUNCÉS
- **Suivi des envois email** : Resend configuré ✓ (clé re_TYG...KQwY) · Expéditeur: onboarding@resend.dev · Email admin: arnaud@gredai.com
- **Stats envoi** : 8 TOTAL · 6 ENVOYÉS · 2 ÉCHECS · 0 EN COURS
- **Test field** : pré-rempli avec arnaud@gredai.com + bouton Envoyer
- **Sidebar Communication** : Newsletter (active) · Plan newsletter annuel 17 · Calendrier social · Pages riches · Pages & blog · Partenaires · Dons & ticker

### 📚 Admin Manuels auto-IA — `/admin/manuals`
- **Capture ID** : `ss_6780lbqf7`
- **🎉 GÉNÉRATION RÉUSSIE GRÂCE AU FIX** : 3 cards manuels fonctionnels
- **CTA top** : Recharger · Régénérer les 3 maintenant · Régénérer + publier Telegram
- **Manuel Utilisateur** : v 2026.05.06.ie1u · 14 sections · 1544 mots · Généré 06/05/2026 13:11:10 · CTA HTML/MD/Vidéo + Régénérer + Telegram
- **Manuel Administrateur** : v 2026.05.06.gl5r · 14 sections · 2770 mots · Généré 06/05/2026 13:09:46
- **Manuel Super-Admin** : v 2026.05.06.swoe · 24 sections · 5499 mots · Généré 06/05/2026 13:19:20
- **Historique récent** : table avec versions, sections, mots, statut Telegram, "Voir"

### 🤖 Admin AI Autopilot — `/admin/ai-autopilot`
- **Capture ID** : `ss_1881iilsz`
- **Observé** : "AI Autopilot — Pilote l'IA autonome du site — toggles, paramètres, quotas, déclenchements manuels"
- **Quota Gemini global** : Max appels/jour 500 · Utilisé aujourd'hui 95/500 (19%)
- **Note** : "Free tier Gemini = 1500/jour. On reste safe avec 500."
- **Toggles features** :
  - GLD Soul (OFF) — La voix du site, réflexion 1ère personne par IA chaque jour
  - Mood Engine (OFF) — Le site adapte son ambiance visuelle
  - Modération forum IA (OFF) — Analyse Gemini de chaque post
  - Newsletter auto (OFF) — Brouillon hebdo généré par IA

### 🏛 Admin Établissements — `/admin/establishments`
- **Capture ID** : `ss_6999ztxnv`
- **Observé** : "Établissements LGBT-friendly · 2694 lieux dans l'annuaire"
- **Actions top** : Wipe importés · Géocoder (54/2694 = 2%) · Import CSV · Inviter un établissement
- **Bulk IA** : Tout sélectionner (2694) · ✨ Enrichir 50 venues vides · Rafraîchir 50 anciens (~1 sec/venue · max 5 min/run)
- **Cards venues** visibles : Médecins LGBT-friendly (27%), Tribu move, The Crisco, Rémi massage bien-être, Queer Stub, La Boîte, Keewee - Séné, Entre hommes, Pixel théâtre

### 🏢 Admin Espace Pro Dashboard — `/admin/pro`
- **Capture ID** : `ss_0681j8egi`
- **Observé** : "Espace Pro · Vue super-admin · Gère tes lieux, événements, coupons, avis"
- **4 KPIs** : 50 lieux · 0 events à venir · 0 coupons actifs · 3 vues totales lieux
- **Studio IA Pro · Outils intelligents (Gemini 2.0)** — 6 outils :
  - Décrire mon lieu — IA rédige description optimisée 4 langues
  - Idées d'événements — Suggestions sur-mesure
  - Répondre aux avis — Réponses personnalisées et bienveillantes
  - Générer des tags — Tags optimisés SEO
  - Importer events Facebook — Bookmarklet · email · sync feed
  - Analyse sentiment — Tendances avis + recommandations
- **Mes lieux (50)** : MORGAN HOT CRUISING BAR, LE CODE (06), AIX SAUNA CLUB...

### 📖 Manuel Super-Admin rendu — `/api/manuals/superadmin`
- **Capture ID** : `ss_5465r50ko`
- **Observé** : Hero gradient pastel rose-violet-vert, "MANUEL SUPER-ADMIN — 🌈 God Loves Diversity"
- **Description** : "Manuel super-admin : pilotage technique complet, sécurité, IA autopilot, infrastructure."
- **Badge** : v2026.05.06 · 6 mai 2026
- **CTA** : 📄 Télécharger en PDF
- **Sommaire** 24 sections en 2 colonnes : Tableau de bord admin · Partenaires · Gérer les établissements · Forum modération · Forum (modération + catégories) · AI Autopilot · Témoignages vidéo · Paramètres techniques · Événements (CRUD) · Intégrations · Newsletter · Dropshipping · Boutique · Utilisateurs · Espace pro venues · Sécurité + audit · Studio IA · Thèmes saisonniers · Avatar IA · Carte mondiale (admin) · Bot Telegram · Cron + scheduled tasks · Photos / Galerie · Déploiement Coolify

---

## Bugs détectés pendant la capture (à fixer rapidement)

| Page | Problème | Priorité |
|---|---|---|
| `/urgence` | Black screen — page critique SOS LGBT | 🔴 P0 |
| `/admin/ai-studio` | Black screen — Studio IA admin | 🔴 P0 |
| `/admin/establishments` géocodage | 54/2694 lieux géocodés (2%) | 🟠 P1 |
| Coolify app | "Restarting (16x→23x)" — vérifier logs runtime | 🟠 P1 |

---

## ✅ Confirmations post-deploy `b01a092`

- `/api/rapport/audit` 🟢 fonctionne (83% complétion, 60 modules live)
- `/api/rapport/securite` 🟢 fonctionne (61% score, 19 OK / 12 warn)
- `/lieux/[slug]` 🟢 logo cropping fix appliqué + VenueBanner SVG procédural visible
- DynamicIslandSearch 🟢 liquid-glass premium déployé sur Navbar publique
- `/admin/pro/venues` 🟢 nouvelle page complète CRUD opérationnelle
- Manuels IA 🟢 3 audiences générées avec succès (user 14s/1544m, admin 14s/2770m, superadmin 24s/5499m)
- Manuels emailés 🟢 3 envois confirmés à arnaud@gredai.com (status 200, ok:true, sent:true)

---

## Pages à capturer dans une session future

### Site public restant
- [ ] `/sos` (route alternative urgence)
- [ ] `/newsletter` (page d'inscription publique)
- [ ] `/newsletters` (archive newsletters)
- [ ] `/gld-local` (carte locale)
- [ ] `/crowdfunding`
- [ ] `/cercles-priere/[id]` (détail d'un cercle live)
- [ ] `/lieux/[slug]` avec photos réelles (autre venue)
- [ ] `/mode-calculatrice` (mode parental)
- [ ] `/mon-espace` (après login)

### Admin (nécessite login)
- [ ] `/admin` (dashboard)
- [ ] `/admin/establishments` (CRUD venues)
- [ ] `/admin/newsletter` (composer + historique)
- [ ] `/admin/pro` (espace pro)
- [ ] `/admin/pro/venues` (NOUVEAU — page CRUD complète)
- [ ] `/admin/ai-studio` (Studio IA)
- [ ] `/admin/ai-autopilot` (Soul + Mood + Modération)
- [ ] `/admin/manuals` (manuel auto IA)
- [ ] `/admin/avatar` (avatar IA)
- [ ] `/admin/telegram` (bot)
- [ ] `/admin/users` (CRUD users)
- [ ] `/admin/forum` (modération)
- [ ] `/admin/themes` (50 thèmes)

---

## Comment intégrer ces screenshots dans les manuels

1. **Solution court-terme** : ces screenshots sont visibles dans le thread Cowork actuel. Tu peux les sauvegarder manuellement et les uploader dans `/admin/photos/upload` puis référencer dans le contenu HTML des manuels.
2. **Solution mid-terme** : ajouter une sous-route `/api/manuals/<audience>?withScreenshots=1` qui injecte automatiquement `<img src="/screenshots/<route-slug>.png">` si un fichier est présent dans `public/screenshots/`.
3. **Solution long-terme** : intégrer Puppeteer dans le Dockerfile (ou API tierce ScreenshotOne), avec un cron mensuel qui régénère les screenshots et les pousse vers MinIO + URL publique.

---

*Capture & doc générées le 6 mai 2026 par Claude · prochaine session : compléter la liste admin après login.*
