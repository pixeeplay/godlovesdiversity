# 📊 Rapport d'audit complet — God Loves Diversity (GLD)

**Date :** 4 mai 2026
**Prod :** https://gld.pixeeplay.com
**Repo :** github.com/pixeeplay/godlovesdiversity (commit `954ceab`)
**Stack :** Next.js 14 App Router · Prisma · PostgreSQL · Coolify · Resend · Stripe · LiveAvatar · ElevenLabs · Gemini

---

## 🟢 Score global

| Domaine | État |
|---|---|
| **Pages publiques** | 16/17 OK (1 endpoint manquant /api/ping) |
| **Routes API** | 95/96 fonctionnelles (1 stub : extract-pdf) |
| **i18n FR/EN/ES/PT** | structure prête, audit IA dispo dans `/admin/i18n` |
| **Mode sombre** | OK |
| **Mode clair** | partiellement réparé aujourd'hui (overrides CSS), reste 4 spots à finir manuellement |
| **Avatar streaming** | LiveAvatar FULL Mode opérationnel après pivot |
| **Newsletter** | OK (Resend + chunked + EmailLog par destinataire) |
| **Boutique + paiements** | OK frontend ; ⚠️ webhook Stripe manquant |
| **Admin** | 96 routes, sidebar avec sous-menus, mobile responsive |

---

## 1️⃣ Newsletter — comment ça marche

**Q : « Comment envoies-tu les newsletters ? »**

**R :** envoi 100 % via **Resend** (fallback SMTP via nodemailer si pas de clé).

| Étape | Détail |
|---|---|
| Trigger | `POST /api/admin/newsletter` (composant `NewsletterEditor.tsx`) |
| Provider | Resend HTTPS API → `https://api.resend.com/emails` |
| From | DB setting `integrations.resend.from` (configurable dans `/admin/settings → Resend`), fallback env `EMAIL_FROM`, défaut `hello@godlovesdiversity.com` |
| Destinataires | Table `NewsletterSubscriber` filtrée `status=ACTIVE` + ajout manuel optionnel, dédupliqué |
| Async | Fire-and-forget (`processNewsletterSend()` lancé sans `await`), HTTP retourne immédiatement le campaign id |
| Throughput | 5 emails en parallèle / batch + 1100 ms entre batches (limite Resend = 10 req/sec) |
| Logs par destinataire | Table `EmailLog` (status `pending → sent / failed`, providerId, errorMessage, campaignId) |
| Suivi UI | `/admin/newsletter/[id]` polled toutes les 2 s : barre de progression + 4 stats + 10 dernières erreurs |
| Bug mineur connu | `campaign.recipients` est réutilisé pour stocker le compteur en cours → la barre de progression devient incorrecte une fois l'envoi démarré |

**Setup pour envoyer en prod** :
1. `/admin/settings → Resend` : clé API + From validé sur Resend (sinon utilise `onboarding@resend.dev`)
2. Vérifier domaine sur Resend (DKIM/SPF) si From custom
3. `/admin/newsletter` → composer → "Envoyer maintenant"

---

## 2️⃣ Audit pages publiques (curl)

| Page | HTTP | Temps | Note |
|---|---|---|---|
| `/` | 200 | 1.82 s | Home FR |
| `/en` | 200 | 0.76 s | Home EN |
| `/galerie` | 200 | 1.67 s | 115 KB (gros) |
| `/affiches` | 200 | 1.64 s | OK |
| `/argumentaire` | 200 | 0.67 s | OK |
| `/message` | 200 | 0.68 s | OK |
| `/boutique` | 200 | 1.89 s | titre custom OK |
| `/newsletter` | 200 | 0.73 s | archive |
| `/contact` | 200 | 0.70 s | OK |
| `/participer` | 200 | 1.69 s | OK |
| `/partenaires` | 200 | 0.52 s | titre custom OK |
| `/api/avatar/enabled` | 200 | 0.50 s | `{enabled:true}` |
| `/api/avatar/streaming/info` | 200 | 0.46 s | tous les modes signalés |
| `/sitemap.xml` | 200 | 0.60 s | hreflang FR/EN/ES/PT |
| `/robots.txt` | 200 | 0.50 s | bloque GPTBot, autorise ClaudeBot |
| **`/api/ping`** | **404** | 1.62 s | ❌ endpoint manquant |

**À optimiser** : home + galerie + boutique + participer ~1.7-1.9 s TTFB → ajouter ISR/cache.

---

## 3️⃣ Inventaire API — 96 routes

### ✅ Tout fonctionne sauf

| Route | Problème |
|---|---|
| `/api/admin/knowledge/extract-pdf` | **Stub 501** — TODO de remplacer par `pdfjs-dist` |
| `/api/admin/newsletter/[id]` | seulement GET — pas de PATCH/DELETE/send unitaire |
| `/api/webhooks/stripe` | **N'existe pas** — checkout fonctionne mais pas de confirmation webhook |
| `/api/ping` | **N'existe pas** — utile pour healthcheck Coolify |

### Sécurité — endpoints publics qui mutent

À auditer (pas forcément un bug, mais à vérifier) :
- `/api/upload` (POST) — file upload public
- `/api/mobile/upload` (POST)
- `/api/photos/[id]/comments` (POST) — risque spam
- `/api/avatar/streaming/talk|stop|info` — non gardés (start/ask le sont)
- `/api/avatar/liveavatar/stop|keep-alive` — non gardés (start le est)
- `/api/checkout`, `/api/donate`, `/api/chat`, `/api/analytics/track` — légitimement publics

---

## 4️⃣ Mode clair — état après fix d'aujourd'hui

### ✅ Corrigé aujourd'hui (commit `954ceab`)
- CSS overrides `.light .bg-zinc-950 / 900 / 900/50 / 950/80 / 800 / black/95`
- CSS overrides `.light .border-zinc-800 / 700`
- `Footer.tsx`, `HeroBannerCarousel.tsx`, `page.tsx` PostersShowcase → utilisent `var(--hero-bg)` / `var(--footer-bg)` qui change avec le thème

### ⚠️ Restant à fixer (priorité décroissante)

| # | Fichier | Souci | Fix |
|---|---|---|---|
| 1 | `MegaMenu.tsx:50,65,94` | `bg-zinc-950/98`, `bg-zinc-900` dans le menu déroulant | Maintenant couvert par CSS global ✅ (à vérifier visuellement) |
| 2 | `CartView.tsx:118-121` | inputs avec `bg-zinc-950` + texte hérité dark | Couvert par CSS ✅ |
| 3 | `Navbar.tsx:147` | drawer mobile `bg-black/95` | Couvert par CSS ✅ (override `bg-black/95` ajoutée) |
| 4 | `AskGldAvatar.tsx:135`, `AskGldWidget.tsx:293` | gradient pink hardcodé `#FBEAF0` + `text-zinc-700` | À refactor — utiliser `var(--surface)` |
| 5 | `PhotoCarousel.tsx:70`, et tous les `bg-zinc-900` qui sont des "photo placeholders" | empty states `text-white/20` deviennent invisibles | Couvert par CSS pour le bg, mais `text-white/20` donne du texte presque invisible en clair → utiliser `text-zinc-500` ou `var(--fg-subtle)` |

**Recommandation** : faire un dernier passage manuel sur `AskGldAvatar` et `MegaMenu` après next deploy.

---

## 5️⃣ Traductions FR/EN/ES/PT — nouveau outil IA déployé

**Déployé aujourd'hui** : `/admin/i18n` (sidebar IA & Outils).

- Audit automatique de toutes les entités traduisibles : Page, Article, Banner, MenuItem, PageSection
- Pour chaque entité, signale les locales manquantes parmi (fr, en, es, pt)
- Bouton « Traduire avec Gemini » → appelle l'API Gemini avec un prompt système orienté GLD (chaleureux, inclusif, fidèle au sens) et upserte les rows dans toutes les langues cibles
- Filtre par modèle, indicateurs visuels (drapeaux 🇫🇷🇬🇧🇪🇸🇵🇹), tableau interactif

**Routes API** :
- `GET /api/admin/i18n/audit` → rapport JSON
- `POST /api/admin/i18n/translate` → `{ model, sourceId, targetLocales? }`

**Pour automatiser** : dans une prochaine itération, ajouter un cron qui appelle `/api/admin/i18n/audit` quotidiennement et envoie un Slack/Telegram si des contenus nouveaux sont incomplets (la lib `notify` est déjà en place).

---

## 6️⃣ Avatar streaming LiveAvatar — état final

| Composant | État | Note |
|---|---|---|
| Lib `src/lib/liveavatar.ts` | ✅ | FULL Mode + LITE Mode + secrets + contexts + reap zombies |
| `/api/avatar/liveavatar/start` | ✅ | FULL Mode (LiveAvatar gère VAD+STT+LLM+TTS nativement) |
| `/api/avatar/liveavatar/stop`, `keep-alive` | ✅ | |
| `/api/admin/liveavatar/list` | ✅ | 60 avatars + voix LA + langues + crédits |
| `/api/admin/liveavatar/sync-context` | ✅ | Envoie le RAG GLD vers LiveAvatar context |
| `/api/admin/liveavatar/reap` | ✅ | Purge sessions zombies (free tier 1 concurrency) |
| `AskGldAvatarLiveAvatar.tsx` | ✅ | LiveKit WebRTC, mute, timer, fallback `getUserMedia` |
| Carte admin Studio | ✅ | Galerie carrée, voix LA filtrées par langue, sélecteur langue, bouton sync RAG |

**Plan free LiveAvatar** : 10 crédits/mois · 2 min/session · 1 session simultanée · watermark.

---

## 7️⃣ Fonctionnalités GLD — état complet

### ✅ Fait et opérationnel

- Pages publiques i18n (FR/EN/ES/PT) — Hero, About, Argumentaire, Message, Galerie, Affiches, Boutique, Newsletter archive, Contact, Participer, Partenaires
- Carte mondiale interactive Leaflet/OSM
- Carrousels home (photos auto-rotation, YouTube, news, products)
- Bandeau ticker dons en haut + cœur rainbow 100 bpm
- Bandeau lieux saints défilant
- Mega-menu navbar avec produits + photos + footer enrichi
- **Boutique e-commerce** : produits + variants (prix/stock/images/IA par variant), images IA Nano Banana, panier, checkout Stripe + HelloAsso + Square, suivi commandes, étiquettes Sendcloud, dropshipping Gelato/TPOP/Printful
- **Newsletter** : abonnement, archive publique, envoi via Resend (chunked + log par destinataire), templates, génération IA
- **Admin BO complet** : sidebar collapsible, mobile responsive (burger drawer), 96 endpoints, dashboard ventes + analytics, AI Studio (10 fonctions), Studio musique IA
- **Cerveau de GLD (RAG)** : KnowledgeDoc + chunks + embeddings Gemini, chat thématique, gestion file Q sans réponse
- **Avatar vidéo HeyGen** : génération clips ~30 s
- **Avatar SVG local** : Web Speech + ElevenLabs (gratuit 10k chars/mois)
- **Avatar streaming LiveAvatar** : conversation temps-réel WebRTC FULL Mode
- **Multi-rôles users** : ADMIN/EDITOR/MODERATOR/VIEWER, visibilité menu super-admin, audit log
- **Intégrations** (page Lovable-style) : Telegram, Slack, Discord, Webhook, WhatsApp, Mailchimp + lib notify universelle
- **Wizard onboarding admin** step-by-step
- **Mode clair/sombre toggle**
- **SEO** : sitemap hreflang FR/EN/ES/PT, robots.txt (bloque GPTBot, autorise ClaudeBot), JSON-LD, IndexNow Bing
- **Sécurité** : rate limiting, consentement upload, avertissement pays à risque, bcrypt, NextAuth
- **Mobile iOS** : projet Xcode SwiftUI natif (zéro Expo, zéro Pods)
- **Floutage IA visages** + détection doublons photos
- **Audit traductions IA** (NOUVEAU aujourd'hui)

### ⚠️ Connu mais à fixer (priorité)

1. **Webhook Stripe manquant** (`/api/webhooks/stripe`) — confirmation paiement non automatique
2. **`/api/ping` manquant** — healthcheck Coolify utile
3. **Stub PDF extraction** (`/api/admin/knowledge/extract-pdf`) — remplacer par `pdfjs-dist`
4. **Performance home/boutique/galerie** — 1.7-1.9 s TTFB, ajouter ISR
5. **Newsletter campaign.recipients double usage** — séparer en `recipientsCount` + `sentCount`
6. **Mode clair AskGldAvatar/AskGldWidget** : gradient pink hardcodé
7. **Mode clair PhotoCarousel placeholders** : `text-white/20` invisible
8. **MegaMenu mode clair** à valider visuellement (devrait être OK avec les overrides CSS d'aujourd'hui)

### 📋 À développer (non commencé)

| Idée | Priorité | Note |
|---|---|---|
| Cron quotidien audit i18n + notif Slack/Telegram si manques | M | Endpoint dispo, juste à scheduler |
| Webhook Stripe pour confirmer paiements | **H** | Bloquant pour comptabilité automatique |
| Page admin "Statistiques" enrichie (Plausible/Umami) | M | Existe partiellement dans dashboard |
| Tests automatisés Playwright | H | Aucun test E2E aujourd'hui |
| Système de coupons/promo dans Boutique | L | |
| Programme parrainage | L | |
| Push notifications mobile (iOS app) | L | |
| Forum/communauté membres | L | |
| Calendrier événements public | M | Modèle déjà dans Prisma |
| Page admin "Backups manuels" | L | Coolify gère les backups Postgres natifs |

---

## 8️⃣ Recommandations next steps

### Cette semaine
1. Déployer ce commit (`954ceab`) sur Coolify pour bénéficier des fixes mode clair + audit i18n
2. Valider visuellement le mode clair sur `/admin/login`, `/`, `/boutique`, `/galerie`, mega-menu mobile
3. Tester `/admin/i18n` → traduire 2-3 entités manuelles pour valider la qualité Gemini
4. Configurer le webhook Stripe (si paiements live)

### Ce mois
1. Ajouter `/api/ping` JSON pour healthcheck
2. Implémenter `pdfjs-dist` pour `/api/admin/knowledge/extract-pdf`
3. Setup Playwright avec 5 tests critiques (home, boutique, panier, admin login, newsletter subscribe)
4. Cron quotidien audit i18n + notif

### Ce trimestre
1. Performance home (lazy load carrousels, ISR)
2. Refactor newsletter `recipients`/`sentCount` séparés
3. Ajouter coupons/promo
4. Calendrier événements public

---

*Rapport généré automatiquement après audit code statique + tests HTTP en production. Dernier déploiement Coolify visible via `gld.pixeeplay.com`.*
