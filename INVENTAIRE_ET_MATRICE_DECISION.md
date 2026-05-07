# 📊 Inventaire complet & Matrice de décision — refonte LGBT

**Date :** 7 mai 2026
**Source :** `https://github.com/pixeeplay/godlovesdiversity` (commit `b421449`)
**Statut :** ⚠️ Inventaire terminé — décisions stratégiques en attente

---

## 🚨 Le projet est BIEN plus gros que prévu

| Métrique | Valeur |
|---|---|
| **Lignes de code** (TS/TSX) | **72 025 LOC** |
| **Modèles Prisma** | **~70 modèles**, 1 965 lignes de schema |
| **Routes API** | **~250** (auth, admin, ai, connect, cron, mobile, prayers…) |
| **Pages publiques** | **~54** sous `/[locale]/...` |
| **Pages admin** | **~80** sous `/admin/...` + `/admin2access` |
| **Composants** | 4 grandes catégories : `connect/`, `prayers/`, `me/`, `admin/` |
| **Bibliothèques internes** | 50+ fichiers dans `src/lib/` |
| **i18n** | FR/EN/ES/PT (4 fichiers, ~89-97 lignes chacun) |
| **Fichiers contenant des refs religieuses** | **368 fichiers** (regex strict) |

**Conclusion :** mon estimation initiale (52-69 h) était optimiste. Refonte complète = **120-180 h** pour faire du propre. Il faut donc trancher sur un **MVP** qu'on lance vite, et reporter le reste en V2.

---

## 🎯 3 scénarios MVP (à choisir)

### Scénario A — MVP "Light" (~40-60 h) ⚡ Recommandé pour staging rapide

> Objectif : `lgbt.pixelplay.com` en ligne dans 2 semaines avec un site propre, sans religion, qui sait basculer Paris/France.

**Inclus** :
- Purge religieuse complète (368 fichiers nettoyés)
- Multi-domaines paris/france via middleware
- Refonte design (moodboard choisi) — Home, Lieux+Carte, Soirées, Pride, Identités, Santé, Assos, Participer, À propos
- Newsletter double opt-in
- Upload photos + modération
- Auth NextAuth + admin de base (modération + newsletter + lieux/events + IA Gemini)
- i18n FR + EN seulement (ES/PT désactivés)

**Exclu (reporté V2)** :
- Connect (Tinder LGBT)
- Boutique / paiement Stripe / dropshipping / loyalty
- Forum, Blog, Mentor, Voyage-safe, SOS, Aide-juridique, Webcams-live, Wrapped
- Voice coach, Avatar IA live (HeyGen), prayer-anything (supprimé pas reporté)
- Telegram bot
- Espace pro (B2B venues)

### Scénario B — MVP "Communauté" (~80-100 h)

> Comme A + on garde les briques sociales fortes pour LGBT.

**Ajoute à A** :
- **Connect refactoré** en "Pride Connect" (rencontres LGBT + posts + messages + premium Stripe)
- Forum communautaire
- Témoignages vidéo
- SOS + Aide juridique LGBT
- Voyage-safe (déjà LGBT-friendly via `risk-countries.ts` !)

### Scénario C — Refonte complète (~140-180 h)

> Tout est gardé et transformé. Délai 4-6 semaines en concentré.

---

## 🧱 Matrice Prisma (70 modèles)

| Modèle | Décision | Raison / Action |
|---|---|---|
| **User**, Account, Session, VerificationToken | ✅ KEEP | Auth NextAuth, intact |
| **Photo**, PhotoComment | ✅ KEEP | Galerie + modération |
| **Page**, Article, Banner, MenuItem, Section | ✅ KEEP | CMS — utile pour pride/lieux/articles |
| **NewsletterSubscriber**, NewsletterCampaign, NewsletterPlan | ✅ KEEP | Newsletter LGBT |
| **ScheduledPost** | ✅ KEEP | Calendrier social |
| **Venue** + VenueType, VenueRating, VenueCoupon | 🔄 TRANSFORM | Étendre VenueType : ajouter `BAR_GAY`, `CLUB_QUEER`, `SAUNA`, `CRUISING`, `SEX_POSITIVE`, `CENTRE_LGBT`, `CABARET_DRAG`, `HEBERGEMENT_REFUGE`, `LIBRAIRIE_QUEER`, `SANTE_LGBT`, `CINEMA`, `MUSEE_QUEER`, etc. Ajouter champ `scope` + `identitiesWelcome[]` |
| **Event** | 🔄 TRANSFORM | Ajouter `EventType` enum LGBT (PRIDE_MARCH, DRAG_SHOW, TEA_DANCE, PERMANENCE, DEPISTAGE…) + `scope` + `identities` |
| **Forum**, ForumCategory, ForumThread, ForumPost | ✅ KEEP | Forum LGBT (renommer catégories par défaut) |
| **VideoTestimony** | 🔄 TRANSFORM | Témoignages LGBT (consentement renforcé, anonymat) |
| **ReferralCode**, Referral | ✅ KEEP | Parrainage |
| **Coupon**, ProductReview, Wishlist, StockAlert | ✅ KEEP (V1 ou V2) | Boutique conservée |
| **LoyaltyAccount**, LoyaltyLedger | ✅ KEEP | Programme fidélité |
| **TelegramMessage** | 🔄 TRANSFORM | Hooks LGBT (canal `pride`, `assos`, `urgences`) |
| **Theme**, Setting | ✅ KEEP | Multi-tenant scope (paris/france) |
| **Manual** | ✅ KEEP | Doc admin |
| **ModerationDecision**, AuditLog, EmailLog | ✅ KEEP | Compliance |
| **Partner** | ✅ KEEP | Assos partenaires |
| **Product**, ProductVariant, Order, OrderItem | ✅ KEEP (V1 ou V2) | Boutique merch pride |
| **PageView** | ✅ KEEP | Analytics |
| **KnowledgeDoc**, KnowledgeChunk, UnansweredQuery | ✅ KEEP | RAG IA assistant |
| **PeerHelp**, PeerHelpResponse | ✅ KEEP | Entraide communautaire |
| **Bookmark** | ✅ KEEP | Favoris utilisateur |
| **AIConversation** | ✅ KEEP | Historique IA |
| **UserActivityLog** | ✅ KEEP | Logs |
| **Connect*** (ConnectProfile, Swipe, Match, Connection, Post, Reaction, Conversation, Message, Report, Block, Premium) | 🔥 KEEP+TRANSFORM (Scénario B/C) | **C'est la killer feature pour LGBT** : profils par identité/orientation, swipe avec filtres genre+orient, premium Stripe |
| **JournalEntry** | ❓ TRANSFORM ou DELETE | Si journal personnel → keep ; si journal de prière → delete |
| **FutureLetter** | ✅ KEEP | "Lettre à mon futur moi" — universel |
| **PrayerMessage** | ❌ DELETE | Religieux pur |
| **SoulEntry** | ❌ DELETE | Religieux pur |
| **UserSubmission** | ✅ KEEP | Soumissions communautaires |

**Bilan Prisma :**
- **Keep** : ~52 modèles
- **Transform** : ~12 modèles (renaming, enum extensions, scope[])
- **Delete** : 2-3 modèles (PrayerMessage, SoulEntry, ?JournalEntry)
- **Migration** : 1 grosse migration `lgbt_refonte_v1` qui ajoute scope, étend les enums, renomme

---

## 🗺️ Pages publiques (54 pages `/[locale]/...`)

### ✅ KEEP (refacto cosmétique uniquement)
| Page | Devient |
|---|---|
| `/agenda` | Agenda LGBT (Pride, soirées, ateliers) |
| `/blog` | Blog éditorial queer |
| `/boutique` + `/[slug]` + `/merci` | Boutique merch pride |
| `/carte` | Carte interactive lieux LGBT |
| `/coming-soon` | Pages "bientôt" |
| `/commande` + `/[token]` | Suivi commande |
| `/contact` | Contact |
| `/forum` + `/[category]` + `/sujet` + `/nouveau` | Forum LGBT |
| `/galerie` | Galerie photos communautaires |
| `/inscription` | Inscription compte |
| `/lieux` + `/[slug]` | Annuaire lieux LGBT |
| `/marketplace` | Marketplace artistes/créateurs queer |
| `/meetups` | Meetups locaux |
| `/membre-plus` | Premium |
| `/mentions-legales` | Légal |
| `/mentor` + `/session` | Mentorat (parrain·e LGBT) |
| `/mon-espace/*` (32 sous-pages) | Espace utilisateur — quasi tout reste |
| `/newsletter` | Inscription newsletter |
| `/newsletters` + `/[id]` | Archives newsletters |
| `/panier` | Panier |
| `/parrainage` | Parrainage |
| `/partager` | Partage social |
| `/partenaires` | Assos partenaires |
| `/participer` | Soumettre photo/lieu/event |
| `/photo` + `/[id]` | Détail photo |
| `/rgpd` | RGPD |
| `/signalement` | Signalement |
| `/sos` + `/contacts` | Hotlines LGBT (déjà câblé via `lgbt-helplines.ts` !) |
| `/temoignages` | Témoignages |
| `/voyage-safe` | Voyage LGBT-safe (déjà pertinent via `risk-countries.ts`) |
| `/wrapped` | Année queer en récap (Spotify-style) |
| `/aide-juridique` | Aide juridique LGBT |
| `/hebergement` | Refuges LGBT (mineur·es exclu·es, trans en danger…) |
| `/voice-coach` | Voice coach (utile pour personnes trans) |
| `/webcams-live` | Lives queer (à modérer fort) |
| `/affiches` | Posters communautaires |
| `/argumentaire` | À supprimer ou refait en "manifeste pride" |
| `/a-propos` | Refait |
| `/crowdfunding` + `/don` | Soutien financier |
| `/espace-pro` + `/facebook-sync` | Espace pro (bars/clubs B2B) |
| `/temoignage-ia` | Témoignage IA |

### 🔄 TRANSFORM en route LGBT (renommer URL ou contenu)
| Avant | Après |
|---|---|
| `/gld-local/[city]` | `/villes/[city]` (focus France) |
| `/journal` (vocal prayer) | À supprimer ou transformer en journal personnel queer |

### ❌ DELETE (pages purement religieuses)
| Page | Raison |
|---|---|
| `/calendrier-religieux` | Calendrier des fêtes religieuses |
| `/camino` | Pèlerinage de Compostelle |
| `/cercles-priere` + `/[circle]` | Cercles de prière |
| `/champ-de-priere` | Champ de prière virtuel |
| `/compagnon-spirituel` | Chatbot spirituel |
| `/officiants` | Officiants religieux |
| `/textes-sacres` | Textes religieux |
| `/verset-inclusif` | Versets bibliques inclusifs |
| `/message` (manifeste religieux) | Refait → `/manifeste` LGBT |
| `/mode-calculatrice` | Mode "déguisé" calculatrice (risk-pays) — peut être conservé en `/safe-mode` |

### ➕ NOUVELLES pages LGBT
| Nouvelle page | Contenu |
|---|---|
| `/pride` | Agenda + actu Pride toute l'année |
| `/soirees` | Vue dédiée nightlife |
| `/identites` | Glossaire orientations + identités de genre + drapeaux |
| `/sante` | PrEP, dépistage, médecins LGBT-friendly |
| `/assos` | Annuaire associations |
| `/manifeste` | Manifeste LGBT (remplace `/message`) |
| `/tech` | "Comment ça marche" — open source, contributif |
| `/villes` | Hub des villes France (LGBT par ville) |

---

## 🎛️ Pages admin (80 pages — très complet déjà)

> La majorité **KEEP** (juste renommage des libellés FR religieux → LGBT). Quelques sections à archiver.

### ✅ KEEP / Renommer
- ai, ai-autopilot, ai-settings, ai/avatar, ai/knowledge → **prompts réécrits LGBT**
- avatar-studio, backup, banners, calendar, content, coupons, donate
- establishments, events, feature-chat, features, forum, home, i18n, import, integrations, integrations/telegram
- invitations, login, mail-setup, manuals, map, menu, menu-permissions, **moderation** (clé)
- news, **newsletter** (clé), newsletter/plan, pages, partners, posters
- pro, pro/ai-studio, pro/events, pro/import-events, pro/venues
- security-2fa, security-settings, settings, setup, shop, shop/dropshipping, shop/orders
- sitemap, themes, time-machine, users, venues, venues/[id], videos
- connect, connect/moderation (Scénario B/C)

### ❌ DELETE
- (rien dans `/admin/*` n'est explicitement religieux — tout passe par renommage)

### ➕ NOUVELLES sections admin
- `/admin/identities` — gérer les drapeaux et identités à afficher
- `/admin/scope` — basculer admin entre vue Paris et vue France

---

## 🛠️ Bibliothèques `src/lib/` (50 fichiers)

| Lib | Décision | Note |
|---|---|---|
| `ai.ts`, `ai-autopilot.ts`, `ai-moderation.ts`, `ai-provider.ts` | 🔄 | Réécriture des prompts |
| `auth.ts` | ✅ | NextAuth |
| `cart.ts` | ✅ | Panier |
| `connect.ts`, `connect-mock.ts`, `connect-moderation.ts` | 🔄 | Connect refactoré LGBT |
| `dropshipping.ts` | ✅ | Boutique |
| `elevenlabs.ts` | ✅ | Voice (utile voice-coach) |
| `email.ts`, `mail-sender.ts` | 🔄 | Templates LGBT |
| `exif.ts`, `imageTools.ts` | ✅ | Photos |
| `facebook-feed-scraper.ts`, `facebook-sync.ts` | ✅ | Sync FB pages |
| `feature-flags.ts` | ✅ | Feature flags |
| `gemini.ts` | 🔄 | Prompts LGBT |
| `geocode.ts`, `og-scraper.ts` | ✅ | |
| `heygen.ts`, `heygen-streaming.ts`, `liveavatar.ts` | ✅ | Avatar IA live (V2) |
| `holiday-calendar.ts` | 🔄 | Garder fêtes civiles + Pride dates, supprimer fêtes religieuses |
| `i18n-audit.ts` | ✅ | Audit traductions |
| **`lgbt-helplines.ts`** | 🔥 ✅ | **Déjà LGBT !** Hotlines par pays |
| `manual-generator.ts` | ✅ | Doc admin |
| `menu-permissions.ts` | ✅ | RBAC |
| `notify.ts` | ✅ | Notifs |
| `prisma.ts` | ✅ | Client |
| `rag.ts` | 🔄 | Réindexer corpus LGBT |
| `rate-limit.ts` | ✅ | Anti-abus |
| **`risk-countries.ts`** | 🔥 ✅ | **Déjà LGBT !** Pays à risque LGBT |
| `sendcloud.ts`, `shipping.ts` | ✅ | Boutique |
| `seo.ts` | 🔄 | Adapter au multi-scope |
| `settings.ts` | ✅ | |
| `sms.ts`, `totp.ts` | ✅ | 2FA |
| `storage.ts` | ✅ | MinIO |
| `telegram-*` (5 fichiers) | 🔄 | Adapter contenus LGBT |
| `themes-seed.ts` | 🔄 | Thèmes LGBT par défaut |
| `translate-job.ts` | ✅ | Traduction auto |
| `venue-enrich.ts`, `venue-freshness.ts` | ✅ | Enrichissement lieux |
| `vocal-prayer-transcribe.ts` | ❌ DELETE | Prière vocale |
| `webcam-resolver.ts`, `webcam-sources.ts` | ✅ | Lives |

**Surprise positive** : 2 fichiers (`lgbt-helplines.ts` + `risk-countries.ts`) sont **déjà LGBT** dans le code. La version actuelle avait commencé à intégrer du contenu LGBT.

---

## 🔌 Routes API critiques

### ✅ KEEP (renommage minimal)
- `/api/auth/*` (NextAuth, magic link, SMS, signup, MFA)
- `/api/admin/*` (~80 routes)
- `/api/ai/*` (caption, chat, image, newsletter, photo, testimony, text, translate)
- `/api/analytics/track`
- `/api/checkout` + `/api/orders` + `/api/products`
- `/api/connect/*` (~10 routes — Scénario B/C)
- `/api/coupons/validate`
- `/api/cron/*` (classify-venues, connect-digest, i18n-audit, newsletter-scheduled, webcams-discover)
- `/api/donate`
- `/api/emergency`, `/api/peer-help/[id]` (clé pour LGBT)
- `/api/forum/*`
- `/api/me/*`
- `/api/menu`, `/api/menu-data`
- `/api/mobile/upload`
- `/api/newsletter/*`
- `/api/officiants` → 🔄 **renommer** `/api/assos`
- `/api/photos/*`, `/api/storage/[...key]`, `/api/upload`
- `/api/podcast/rss.xml`
- `/api/rapport/audit`, `/api/rapport/securite`
- `/api/research/export` (export data RGPD)
- `/api/search`
- `/api/share-card/*`
- `/api/submissions`, `/api/testimonies`, `/api/themes/active`
- `/api/venues`, `/api/wishlist`
- `/api/webhooks/email-events`, `/api/webhooks/stripe`, `/api/webhooks/telegram`

### ❌ DELETE
- `/api/spiritual-companion`
- `/api/avatar/*` (peut être conservé en V2)
- `/api/branding` (à voir)
- `/api/admin/seed-camino`
- `/api/admin/seed-religious-events`
- `/api/admin/seed-officiants` → 🔄 renommer `seed-assos`
- `/api/admin/seed-world-events` → 🔄 renommer `seed-pride-events`
- `/api/prayer-candles`, `/api/prayer-chat`, `/api/prayer-chat/[circle]`, `/api/prayer-intentions`, `/api/prayer-presence`, `/api/prayers`, `/api/prayers/vocal`
- `/api/sacred-annotations`
- `/api/soul`
- `/api/rapport/religious-census`
- `/api/camino`

---

## 🌐 Multilingue (i18n)

`src/messages/fr.json` (97 lignes) commence par :
> `"tagline": "Dieu aime la diversité"`
> `"manifesto_text": "Dieu n'est pas opposé aux personnes LGBT…"`

→ **Réécriture intégrale** des 4 JSON.

**Décision V1** : on garde FR + EN, on désactive ES + PT (les fichiers restent mais non listés dans `routing.ts`).
**V2** : réactiver ES et PT avec traduction IA (déjà câblé via `/api/cron/i18n-audit`).

---

## ⏱️ Timing révisé

| Scénario | Estimation | Délai en concentré (8h/j) | En sessions de 2-3h |
|---|---|---|---|
| **A — MVP Light** | 40-60 h | 5-8 jours | 2-3 semaines |
| **B — MVP Communauté** | 80-100 h | 10-13 jours | 4-5 semaines |
| **C — Refonte complète** | 140-180 h | 18-23 jours | 7-9 semaines |

---

## ❓ Décisions à valider AVANT que je code

| # | Question | Options | Mon reco |
|---|---|---|---|
| **D1** | Scénario MVP ? | A · B · C | **A** pour staging rapide, puis on enrichit |
| **D2** | Moodboard design ? | Néon · Pastel · Hybride | **Néon** ou **Hybride** pour diff vs portails LGBT existants |
| **D3** | Garder Connect (Tinder LGBT) en V1 ? | Oui · Non | **Non en V1** (gros chantier modération) → V1.5 |
| **D4** | Garder boutique en V1 ? | Oui · Non | **Non en V1** → V2 |
| **D5** | Marque-chapeau ? | parislgbt + francelgbt seulement · "Pride Atlas" · "Queer France" · autre | parislgbt/francelgbt seulement, simple |
| **D6** | Email admin par défaut | arnaud@gredai.com (actuel) | OK ? |
| **D7** | Mot de passe admin par défaut | À définir | À me donner ou je génère |
| **D8** | i18n V1 | FR seul · FR+EN · les 4 | **FR+EN** (ES+PT en V2) |
| **D9** | Modération photos | A priori (toutes en PENDING) · A posteriori (publication immédiate + flag) | **A priori** (LGBT = sensible, sûr de chez sûr) |
| **D10** | Domaines DNS | parislgbt.com (déjà à toi ?) · francelgbt.com (déjà à toi ?) · lgbt.pixelplay.com (sous Coolify ?) | À vérifier de ton côté |

---

## 📂 État du dossier `/Users/arnaudgredai/Desktop/parislgbt.com/`

```
✅ Code complet copié depuis GitHub (commit b421449)
✅ src/, prisma/, public/, docker/, data/, apps/, docs/ : remplis
✅ MOODBOARDS_LGBT.html : préservé
✅ PLAN_ACTION_LGBT_2026.md : préservé
✅ INVENTAIRE_ET_MATRICE_DECISION.md : ce fichier
```

Le repo n'est pas encore initialisé en git localement (j'attends ta validation pour faire le clone propre + nouvelle branche).

---

## 🚀 Prochaine étape

> Confirme-moi les **D1, D2, D3, D4** et je lance la Phase 1 (purge + audit regex committable) tout de suite.

Si tu valides "Scénario A + Néon + Connect/Boutique en V2", je peux livrer un staging fonctionnel sur `lgbt.pixelplay.com` en **2 semaines max**.
