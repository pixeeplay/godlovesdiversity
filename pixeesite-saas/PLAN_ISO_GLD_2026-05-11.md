# PLAN ISO-A-ISO — Clone GLD vers Pixeesite (template thème-agnostique)

> Snapshot : 2026-05-11
> Source GLD : `/Users/arnaudgredai/Desktop/godlovedirect/src/app` + `prisma/schema.prisma`
> Cible Pixeesite : `/Users/arnaudgredai/Desktop/godlovedirect/pixeesite-saas/apps/{admin,render}` + `packages/database/prisma/tenant.prisma`
> Périmètre : 193 pages GLD totales (admin + front locale + connect + embed) → coquille vide multi-thèmes dans Pixeesite

Légende STATUS :
- `OK` : déjà porté iso dans Pixeesite (fichier équivalent existe)
- `PART` : porté partiellement (squelette présent mais incomplet)
- `MISS` : manquant, à porter from scratch
- `RELIG` : religieux-spécifique GLD à généraliser avant portage

---

## A. Inventaire ADMIN (back-office)

Total pages GLD admin détectées : **82** (sous `/src/app/admin/**/page.tsx`, hors layout/client components).

### A.1 Pages CORE déjà en partie portées dans Pixeesite

| Page GLD | URL | Composant GLD | Tables DB | Secrets / APIs | Status Pixeesite | Action |
|---|---|---|---|---|---|---|
| Dashboard admin | `/admin` | `src/app/admin/page.tsx` | `Setting`, `PageView` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/page.tsx` | Vérifier widgets + stats |
| Login | `/admin/login` | `src/app/admin/login/page.tsx` | `User`, `LoginAttempt` | NEXTAUTH_SECRET | OK — `apps/admin/src/app/login/page.tsx` | RAS |
| Settings | `/admin/settings` | `src/app/admin/settings/page.tsx` | `Setting` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/settings/page.tsx` | Élargir clés Setting iso GLD |
| Users | `/admin/users` | `src/app/admin/users/page.tsx` | `User`, `Account` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/users/page.tsx` + `team/page.tsx` | Ajouter override menu + `UserMenuOverride` |
| Pages CMS | `/admin/pages` | `src/app/admin/pages/page.tsx` | `Page` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/pages/page.tsx` | Iso (RichPage tenant) |
| News / Articles | `/admin/news` | `src/app/admin/news/page.tsx` | `Article` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/blog/page.tsx` | Iso |
| Banners | `/admin/banners` | `src/app/admin/banners/page.tsx` | `Banner` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/banners/page.tsx` | Iso |
| Menu nav | `/admin/menu` | `src/app/admin/menu/page.tsx` | `MenuItem` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/menu/page.tsx` | Iso |
| Menu perms | `/admin/menu-permissions` | `src/app/admin/menu-permissions/page.tsx` | `Setting`, `UserMenuOverride` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/menu-visibility/page.tsx` | Compléter override per-user |
| Shop produits | `/admin/shop` | `src/app/admin/shop/page.tsx` | `Product`, `ProductVariant` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/shop/page.tsx` | Iso (sans ProductVariant) |
| Shop orders list | `/admin/shop/orders` | `src/app/admin/shop/orders/page.tsx` | `Order`, `OrderItem` | Stripe, Boxtal | OK — `apps/admin/src/app/dashboard/orgs/[slug]/orders/page.tsx` | Iso |
| Shop order detail | `/admin/shop/orders/[id]` | `src/app/admin/shop/orders/[id]/page.tsx` | `Order`, `OrderItem` | Stripe, Boxtal | OK — `apps/admin/src/app/dashboard/orgs/[slug]/orders/[id]/page.tsx` | Iso |
| Dropshipping | `/admin/shop/dropshipping` | `src/app/admin/shop/dropshipping/page.tsx` | `Product` (`dropProvider`, `dropProductId`) | GELATO_KEY, TPOP_KEY, PRINTFUL_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/dropshipping/page.tsx` | Iso |
| Coupons | `/admin/coupons` | `src/app/admin/coupons/page.tsx` | `Coupon` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/coupons/page.tsx` | Iso |
| Forum admin | `/admin/forum` | `src/app/admin/forum/page.tsx` | `ForumCategory`, `ForumThread`, `ForumPost` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/forum/page.tsx` | Iso (généraliser `requireAdminApproval`) |
| Témoignages vidéo | `/admin/temoignages` | `src/app/admin/temoignages/page.tsx` | `VideoTestimony` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/testimonials/page.tsx` | Iso (Testimonial tenant) |
| Videos YouTube | `/admin/videos` | `src/app/admin/videos/page.tsx` | `YoutubeVideo` | YOUTUBE_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/youtube/page.tsx` | Iso |
| Events | `/admin/events` | `src/app/admin/events/page.tsx` | `Event` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/events/page.tsx` | Iso |
| Calendar | `/admin/calendar` | `src/app/admin/calendar/page.tsx` | `ScheduledPost`, `Event` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/social-calendar/page.tsx` | Iso |
| Newsletter | `/admin/newsletter` | `src/app/admin/newsletter/page.tsx` | `NewsletterCampaign`, `NewsletterSubscriber` | RESEND_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/newsletter/page.tsx` | Iso |
| Newsletter Plan | `/admin/newsletter/plan` | `src/app/admin/newsletter/plan/page.tsx` + `NewsletterPlanClient.tsx` | `NewsletterPlan` | GEMINI_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/newsletter-plan/page.tsx` | Iso |
| Map admin | `/admin/map` | `src/app/admin/map/page.tsx` | `Venue`, `MapLocation` | MAPBOX/GOOGLE_MAPS | OK — `apps/admin/src/app/dashboard/orgs/[slug]/map/page.tsx` | Iso (utiliser `MapLocation` tenant) |
| Partners | `/admin/partners` | `src/app/admin/partners/page.tsx` | `Partner` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/partners/page.tsx` | Iso |
| Posters | `/admin/posters` | `src/app/admin/posters/page.tsx` | `Poster` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/posters/page.tsx` | Iso |
| Themes | `/admin/themes` | `src/app/admin/themes/page.tsx` | `Theme` (GLD model riche) | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/themes/page.tsx` + `ai-theme/page.tsx` | Compléter auto-activation, holiday, music |
| Integrations | `/admin/integrations` | `src/app/admin/integrations/page.tsx` | `IntegrationConfig` | multiples | OK — `apps/admin/src/app/dashboard/orgs/[slug]/integrations/page.tsx` | Iso |
| Telegram bot | `/admin/integrations/telegram` | `src/app/admin/integrations/telegram/page.tsx` | `TelegramMessage`, `TelegramAlert` | TELEGRAM_BOT_TOKEN | OK — `apps/admin/src/app/dashboard/orgs/[slug]/telegram-bot/page.tsx` | Iso (ajouter log messages) |
| Mail webmail | `/admin/mail` | `src/app/admin/mail/page.tsx` | `MailAccount`, `MailDraft` | IMAP/SMTP | OK — `apps/admin/src/app/dashboard/orgs/[slug]/mail/page.tsx` | Iso |
| Mail setup | `/admin/mail-setup` | `src/app/admin/mail-setup/page.tsx` | `MailAccount` | IMAP/SMTP | OK — `apps/admin/src/app/dashboard/orgs/[slug]/mail-setup/page.tsx` | Iso |
| Leads CRM | `/admin/leads` | `src/app/admin/leads/page.tsx` | `Lead`, `LeadInteraction` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/leads/page.tsx` | Iso |
| Leads scraper | `/admin/leads/scraper` | `src/app/admin/leads/scraper/page.tsx` + `new` | `LeadScrapeJob`, `ScraperJob` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/scraper/page.tsx` | Iso |
| Leads templates | `/admin/leads/templates` | `src/app/admin/leads/templates/page.tsx` | `EmailTemplate` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/email-templates/page.tsx` | Iso |
| Tasks Kanban | `/admin/tasks` | `src/app/admin/tasks/page.tsx` | `Task` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/tasks/page.tsx` | Iso |
| AI Knowledge / RAG | `/admin/ai/knowledge` | `src/app/admin/ai/knowledge/page.tsx` | `KnowledgeDoc`, `KnowledgeChunk`, `UnansweredQuery` | GEMINI_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/rag/page.tsx` | Iso (RagSource/RagChunk tenant) |
| AI Brain 3D | `/admin/ai/knowledge/brain` | `src/app/admin/ai/knowledge/brain/page.tsx` | `KnowledgeChunk` (embeddings) | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/brain-3d/page.tsx` | Iso |
| AI Playground | `/admin/ai/knowledge/playground` | `src/app/admin/ai/knowledge/playground/page.tsx` | `KnowledgeChunk` | GEMINI/OPENAI | OK — `apps/admin/src/app/dashboard/orgs/[slug]/playground/page.tsx` | Iso |
| AI Autopilot | `/admin/ai-autopilot` | `src/app/admin/ai-autopilot/page.tsx` + `AiAutopilotClient.tsx` | `AiAutopilotRule` | ANTHROPIC_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/ai-autopilot/page.tsx` | Iso |
| AI Settings | `/admin/ai-settings` | `src/app/admin/ai-settings/page.tsx` | `Setting` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/ai/page.tsx` | Iso |
| Avatar Studio | `/admin/avatar-studio` | `src/app/admin/avatar-studio/page.tsx` | `Avatar`, `AvatarGeneration` | AVATAR_V / TAVUS / HEYGEN | OK — `apps/admin/src/app/dashboard/orgs/[slug]/avatar-studio/page.tsx` | Iso |
| Manuals | `/admin/manuals` | `src/app/admin/manuals/page.tsx` + `ManualsAdminClient.tsx` | `Manual`, `AiManual` | GEMINI_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/manuals/page.tsx` | Iso |
| Time Machine | `/admin/time-machine` | `src/app/admin/time-machine/page.tsx` | `AuditLog` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/time-machine/page.tsx` | Iso |
| VSCode online | `/admin/vscode-online` | `src/app/admin/vscode-online/page.tsx` | — | code-server | OK — `apps/admin/src/app/dashboard/orgs/[slug]/vscode-online/page.tsx` | Iso |
| Claude workspace | `/admin/claude-workspace` | `src/app/admin/claude-workspace/page.tsx` | `ClaudeSession`, `ClaudeMessage`, `ClaudeApproval` | ANTHROPIC_API_KEY | OK — `apps/admin/src/app/dashboard/orgs/[slug]/claude-workspace/page.tsx` | Iso |
| Feature flags | `/admin/features` | `src/app/admin/features/page.tsx` | `Setting` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/feature-flags/page.tsx` | Iso |
| i18n | `/admin/i18n` | `src/app/admin/i18n/page.tsx` | `Page` (locale) | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/translations/page.tsx` | Iso |
| Sitemap | `/admin/sitemap` | `src/app/admin/sitemap/page.tsx` | `SitemapEntry` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/sitemap/page.tsx` | Iso |
| Page Builder index | `/admin/page-builder` | `src/app/admin/page-builder/page.tsx` | `PageBlock`, `SitePage` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/pages/page.tsx` | Iso (déjà SitePage tenant) |
| Page Builder edit | `/admin/page-builder/[slug]` | `src/app/admin/page-builder/[slug]/page.tsx` | `PageBlock`, `SitePage` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/sites/[siteSlug]/edit/page.tsx` | Vérifier parité blocs |
| Secrets | `/admin/secrets` | `src/app/admin/secrets/page.tsx` | `Setting` | — | OK — `apps/admin/src/app/admin/secrets/page.tsx` | Iso (mais c'est platform-level) |
| Moderation | `/admin/moderation` | `src/app/admin/moderation/page.tsx` | `ModerationDecision`, `ModerationItem` | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/moderation/page.tsx` | Iso |
| Bulk import | `/admin/import` | `src/app/admin/import/page.tsx` | (multi-modèles) | — | OK — `apps/admin/src/app/dashboard/orgs/[slug]/bulk-import/page.tsx` | Iso |

### A.2 Pages PORTÉES PARTIEL (squelette présent, contenu incomplet)

| Page GLD | URL | Composant GLD | Tables DB | Status Pixeesite | Manque |
|---|---|---|---|---|---|
| AI hub | `/admin/ai` | `src/app/admin/ai/page.tsx` | `Setting`, `AiManual` | PART — `apps/admin/src/app/dashboard/orgs/[slug]/ai/page.tsx` | UI dashboard providers (Gemini/OpenAI/Anthropic/Mistral/Groq), test prompt |
| AI Knowledge scraper | `/admin/ai/knowledge/scraper` | `src/app/admin/ai/knowledge/scraper/page.tsx` | `ScraperJob`, `KnowledgeDoc` | PART — fusionné dans `scraper/page.tsx` | UI dédiée scraping → indexation RAG |
| AI Knowledge docs | `/admin/ai/knowledge/docs/[id]` | `src/app/admin/ai/knowledge/docs/[id]/page.tsx` | `KnowledgeDoc`, `KnowledgeChunk` | PART — `rag/page.tsx` (liste mais pas detail) | Page detail doc + re-chunking |
| AI Legal | `/admin/ai/legal` | `src/app/admin/ai/legal/page.tsx` | `AIConversation` | PART — `legal-assistant/page.tsx` | Storage convs + presets |
| AI Avatar legacy | `/admin/ai/avatar` | `src/app/admin/ai/avatar/page.tsx` | `Avatar` | PART — recouvre `avatar-studio` | Décider lequel garder |
| Establishments | `/admin/establishments` | `src/app/admin/establishments/page.tsx` | `Venue` (RELIG VenueType subset) | PART — utilise `MapLocation`, pas `Venue` riche | Étendre MapLocation avec rating/owner/enrichmentSources |
| Setup wizard | `/admin/setup` | `src/app/admin/setup/page.tsx` | `Setting` | PART — `apps/admin/src/app/onboarding/page.tsx` | Wizard complet 5 étapes (org → site → théma → users → integrations) |
| Backup | `/admin/backup` | `src/app/admin/backup/page.tsx` | (export multi) | MISS — pas trouvé | Export ZIP DB + assets MinIO |
| 2FA Security | `/admin/security-2fa` | `src/app/admin/security-2fa/page.tsx` | `UserMfa`, `SmsCode` | PART — `apps/admin/src/app/dashboard/orgs/[slug]/security/page.tsx` | Setup TOTP + backup codes + SMS Twilio |
| Security settings | `/admin/security-settings` | `src/app/admin/security-settings/page.tsx` | `LoginAttempt`, `Setting` | PART — `security/page.tsx` | Lockout policy, IP allow-list, log viewer |
| Invitations | `/admin/invitations` | `src/app/admin/invitations/page.tsx` | `AdminInvitation` | MISS | Page liste + CRUD invits magic-link |
| Connect admin | `/admin/connect` | `src/app/admin/connect/page.tsx` | `ConnectProfile`, etc | RELIG — réseau social spécifique | À généraliser en "community admin" |
| Connect moderation | `/admin/connect/moderation` | `src/app/admin/connect/moderation/page.tsx` | `ConnectReport`, `ConnectBlock` | RELIG | À généraliser |
| Pro hub | `/admin/pro` | `src/app/admin/pro/page.tsx` | `Venue` (owner = pro) | RELIG (espace pro pour gérants de lieux LGBT-friendly) | À généraliser en "Multi-tenant suite" (déjà cœur Pixeesite) |
| Pro events | `/admin/pro/events` | `src/app/admin/pro/events/page.tsx` | `Event` | RELIG | iso events admin |
| Pro venues | `/admin/pro/venues` | `src/app/admin/pro/venues/page.tsx` | `Venue` | RELIG | iso venues admin |
| Pro AI studio | `/admin/pro/ai-studio` | `src/app/admin/pro/ai-studio/page.tsx` | (génération posters/banners IA) | OK — chevauche `avatar-studio` + `posters` | iso |
| Pro import events | `/admin/pro/import-events` | `src/app/admin/pro/import-events/page.tsx` | `Event` (`externalSource`) | MISS | Import Facebook events + iCal |
| Venues admin | `/admin/venues` | `src/app/admin/venues/page.tsx` | `Venue` | RELIG | À fusionner avec `map/page.tsx` Pixeesite |
| Venue detail | `/admin/venues/[id]` | `src/app/admin/venues/[id]/page.tsx` | `Venue`, `Event`, `VenueCoupon` | RELIG | iso |
| Content hub | `/admin/content` | `src/app/admin/content/page.tsx` | `Article`, `Page`, `Section` | PART — distribué dans `pages` + `blog` + `news` | Hub d'agrégation contenus |
| Home hero builder | `/admin/home` | `src/app/admin/home/page.tsx` | `Banner`, `Section` | PART — `banners/page.tsx` + `pages/page.tsx` | Builder home dédié |
| Donate | `/admin/donate` | `src/app/admin/donate/page.tsx` | `Setting`, Stripe | MISS | UI gestion campagnes don + Stripe |
| Prices comparator | `/admin/prices` | `src/app/admin/prices/page.tsx` + `[id]` | `PriceWatch`, `CompetitorProduct`, `PriceSnapshot` | MISS | Module entier (e-commerce avancé, B2B) |
| Tariffs | `/admin/tariffs` | `src/app/admin/tariffs/page.tsx` | `TariffSource`, `TariffImport` | MISS | Import fournisseurs CSV/FTP |
| Leads legal | `/admin/leads/legal` | `src/app/admin/leads/legal/page.tsx` | `Setting` | MISS | Page de conformité RGPD scraping |
| Feature chat | `/admin/feature-chat` | `src/app/admin/feature-chat/page.tsx` | `AIConversation` | MISS | Chat IA pour piloter le site |
| Claude CLI | `/admin/claude-cli` | `src/app/admin/claude-cli/page.tsx` | `ClaudeSession`, `ClaudeMessage` | PART — `claude-workspace/page.tsx` | CLI streaming live |

### A.3 Totaux ADMIN

- GLD admin pages : **82**
- Déjà portées OK : **49** (60 %)
- Partiellement portées : **18** (22 %)
- Manquantes pures : **9** (11 %)
- Religieux à généraliser : **6** (7 %) — venues, establishments, connect, pro hub

---

## B. Inventaire FRONT (public)

Total pages GLD front détectées : **111** (sous `/src/app/[locale]/**/page.tsx` + `/src/app/connect/**` + `/src/app/embed/**`).

### B.1 Pages CORE génériques (toutes RELIG-friendly, peu de mapping)

| Page GLD | URL front | Composant | Données | SEO/sitemap | Status Pixeesite | Action |
|---|---|---|---|---|---|---|
| Home | `/` | `src/app/[locale]/page.tsx` | `Banner`, `Article`, `Photo`, `YoutubeVideo`, `Testimonial`, `Partner` | sitemap.xml | OK — `apps/render/src/app/[[...slug]]/page.tsx` (catch-all) | Templater home par thème |
| About | `/a-propos` | `src/app/[locale]/a-propos/page.tsx` | `Page` | OK | OK — RichPage tenant | iso |
| Contact | `/contact` | `src/app/[locale]/contact/page.tsx` | `FormConfig`, `FormSubmission` | OK | OK — `apps/render/src/app/contact/page.tsx` + `ContactForm.tsx` | iso |
| Mentions légales | `/mentions-legales` | `src/app/[locale]/mentions-legales/page.tsx` | `Page` | OK | OK — RichPage tenant | iso |
| RGPD | `/rgpd` | `src/app/[locale]/rgpd/page.tsx` | `Page` | OK | OK — RichPage tenant | iso |
| Newsletter signup | `/newsletter` | `src/app/[locale]/newsletter/page.tsx` | `NewsletterSubscriber` | OK | OK — form intégrée render | iso |
| Newsletter archives | `/newsletters` | `src/app/[locale]/newsletters/page.tsx` | `NewsletterCampaign` | OK | MISS | Archive publique newsletters |
| Newsletter detail | `/newsletters/[id]` | `src/app/[locale]/newsletters/[id]/page.tsx` | `NewsletterCampaign` | OK | MISS | iso |
| Blog list | `/blog` | `src/app/[locale]/blog/page.tsx` | `Article` | OK | OK — `apps/render/src/app/blog/page.tsx` | iso |
| Blog detail | `/blog/[slug]` | (à confirmer) | `Article` | OK | OK — `apps/render/src/app/blog/[slug]/page.tsx` | iso |
| Forum index | `/forum` | `src/app/[locale]/forum/page.tsx` | `ForumCategory`, `ForumThread` | OK | OK — `apps/render/src/app/forum/page.tsx` | iso |
| Forum category | `/forum/[category]` | `src/app/[locale]/forum/[category]/page.tsx` | `ForumThread` | OK | MISS — pas de page catégorie | Ajouter |
| Forum thread | `/forum/sujet/[slug]` | `src/app/[locale]/forum/sujet/[slug]/page.tsx` | `ForumThread`, `ForumPost` | OK | OK — `apps/render/src/app/forum/[slug]/page.tsx` | iso |
| Forum nouveau | `/forum/nouveau` | `src/app/[locale]/forum/nouveau/page.tsx` | `ForumThread` | noindex | MISS | Ajouter |
| Boutique list | `/boutique` | `src/app/[locale]/boutique/page.tsx` | `Product` | OK | OK — `apps/render/src/app/shop/page.tsx` | iso |
| Boutique detail | `/boutique/[slug]` | `src/app/[locale]/boutique/[slug]/page.tsx` | `Product`, `ProductVariant`, `ProductReview` | OK | OK — `apps/render/src/app/shop/[slug]/page.tsx` | Ajouter reviews+variants |
| Panier | `/panier` | `src/app/[locale]/panier/page.tsx` | `Product` (localStorage cart) | noindex | MISS | Ajouter cart |
| Merci commande | `/boutique/merci` | `src/app/[locale]/boutique/merci/page.tsx` | `Order` | noindex | MISS | Ajouter |
| Suivi commande | `/commande/[token]` | `src/app/[locale]/commande/[token]/page.tsx` | `Order` (`publicToken`) | noindex | MISS | Ajouter |
| Galerie photos | `/galerie` | `src/app/[locale]/galerie/page.tsx` | `Photo` | OK | MISS | Module gallery (Asset tenant) |
| Photo detail | `/photo/[id]` | `src/app/[locale]/photo/[id]/page.tsx` | `Photo`, `PhotoComment` | OK | MISS | Ajouter |
| Agenda | `/agenda` | `src/app/[locale]/agenda/page.tsx` | `Event` | OK | MISS | Ajouter (Event tenant existe) |
| Carte | `/carte` | `src/app/[locale]/carte/page.tsx` | `Venue` | OK | MISS — MapLocation tenant existe mais pas de page render | Ajouter |
| Témoignages | `/temoignages` | `src/app/[locale]/temoignages/page.tsx` | `VideoTestimony` | OK | MISS — Testimonial tenant existe | Ajouter |
| Partenaires | `/partenaires` | `src/app/[locale]/partenaires/page.tsx` | `Partner` | OK | MISS | Ajouter (Partner tenant existe) |
| Affiches | `/affiches` | `src/app/[locale]/affiches/page.tsx` | `Poster` | OK | MISS | Ajouter |
| Don | `/don` | `src/app/[locale]/don/page.tsx` | `Setting`, Stripe | OK | MISS | Ajouter |
| Inscription | `/inscription` | `src/app/[locale]/inscription/page.tsx` | `User` (signup) | noindex | OK — `apps/admin/src/app/signup/page.tsx` (admin user) | iso côté public |
| Merci générique | `/merci` | `src/app/[locale]/merci/page.tsx` | — | noindex | MISS | Ajouter |
| Pages dynamiques | `/p/[...slug]` | `src/app/[locale]/p/[...slug]/page.tsx` | `Page` | OK | OK — `apps/render/src/app/[[...slug]]/page.tsx` | iso (déjà catch-all) |
| Coming soon | `/coming-soon/[feature]` | `src/app/[locale]/coming-soon/[feature]/page.tsx` | — | noindex | MISS | Trivial à ajouter |
| Demo parallax | `/demo-parallax-photo` | `src/app/[locale]/demo-parallax-photo/page.tsx` | `Photo` | noindex | MISS | Démo composant |
| Embed widgets | `/embed/[topic]` | `src/app/embed/[topic]/page.tsx` | (multi) | noindex | MISS | Système d'embed iframe externe |

### B.2 Pages CORE éditoriales

| Page GLD | URL front | Composant | Données | Status Pixeesite | Action |
|---|---|---|---|---|---|
| Argumentaire | `/argumentaire` | `src/app/[locale]/argumentaire/page.tsx` | `Section` (pageSlug=argumentaire) | MISS | iso section-based RichPage |
| Message | `/message` | `src/app/[locale]/message/page.tsx` | `Section` | MISS | iso |
| Participer | `/participer` | `src/app/[locale]/participer/page.tsx` | `Section` | MISS | iso |
| Partager | `/partager` | `src/app/[locale]/partager/page.tsx` | `Section` | MISS | iso |

### B.3 Mon Espace (24 pages) — espace membre

| Page GLD | URL front | Composant | Données | Status Pixeesite | Action |
|---|---|---|---|---|---|
| Espace membre | `/mon-espace` | `src/app/[locale]/mon-espace/page.tsx` | `User`, multi | MISS | Hub espace utilisateur |
| Profil | `/mon-espace/profil` | `src/app/[locale]/mon-espace/profil/page.tsx` | `User` (bio, identity, traditions) | MISS — User tenant minimaliste | Ajouter profil étendu |
| Notifications | `/mon-espace/notifications` | `src/app/[locale]/mon-espace/notifications/page.tsx` | `User.notify*` flags | MISS | iso |
| Journal | `/mon-espace/journal` | `src/app/[locale]/mon-espace/journal/page.tsx` | `JournalEntry` | MISS | iso (journal privé) |
| Lettres | `/mon-espace/lettres` | `src/app/[locale]/mon-espace/lettres/page.tsx` | `FutureLetter` | MISS | iso (lettres futur soi) |
| Posts perso | `/mon-espace/posts` | `src/app/[locale]/mon-espace/posts/page.tsx` | `ConnectPost`, `ForumThread` | RELIG | iso (à généraliser) |
| Témoignages | `/mon-espace/temoignages` | `src/app/[locale]/mon-espace/temoignages/page.tsx` | `VideoTestimony` | MISS | iso |
| Photos perso | `/mon-espace/photos` | `src/app/[locale]/mon-espace/photos/page.tsx` | `Photo` | MISS | iso |
| Commentaires | `/mon-espace/commentaires` | `src/app/[locale]/mon-espace/commentaires/page.tsx` | `ForumPost`, `PhotoComment` | MISS | iso |
| Brouillons | `/mon-espace/brouillons` | `src/app/[locale]/mon-espace/brouillons/page.tsx` | `ConnectPost` (draft) | MISS | iso |
| Favoris | `/mon-espace/favoris` | `src/app/[locale]/mon-espace/favoris/page.tsx` | `Bookmark` | MISS | iso |
| Likes | `/mon-espace/likes` | `src/app/[locale]/mon-espace/likes/page.tsx` | `ConnectReaction` | MISS | iso |
| Abonnements | `/mon-espace/abonnements` | `src/app/[locale]/mon-espace/abonnements/page.tsx` | `ConnectPremium`, Stripe | MISS | iso |
| Activité | `/mon-espace/activite` | `src/app/[locale]/mon-espace/activite/page.tsx` | `UserActivityLog` | MISS | iso |
| Voyage | `/mon-espace/voyage` | `src/app/[locale]/mon-espace/voyage/page.tsx` | `UserSubmission` (voyage-safe) | RELIG | À généraliser |
| Hotlines | `/mon-espace/hotlines` | `src/app/[locale]/mon-espace/hotlines/page.tsx` | (statique) | RELIG (SOS LGBT) | À généraliser |
| RSVP | `/mon-espace/rsvp` | `src/app/[locale]/mon-espace/rsvp/page.tsx` | `Event` | MISS | iso |
| Cercles | `/mon-espace/cercles` | `src/app/[locale]/mon-espace/cercles/page.tsx` | `PrayerPresence` | RELIG | À généraliser ("communautés") |
| Mentor | `/mon-espace/mentor` | `src/app/[locale]/mon-espace/mentor/page.tsx` | `UserSubmission` (mentor) | RELIG | iso (programme parrainage) |
| Commandes | `/mon-espace/commandes` | `src/app/[locale]/mon-espace/commandes/page.tsx` | `Order` | MISS | iso |
| Wishlist | `/mon-espace/wishlist` | `src/app/[locale]/mon-espace/wishlist/page.tsx` | `Wishlist` | MISS | iso |
| Avis | `/mon-espace/avis` | `src/app/[locale]/mon-espace/avis/page.tsx` | `ProductReview` | MISS | iso |
| Adresses | `/mon-espace/adresses` | `src/app/[locale]/mon-espace/adresses/page.tsx` | `Order.shippingAddress` | MISS | iso |
| Signalements | `/mon-espace/signalements` | `src/app/[locale]/mon-espace/signalements/page.tsx` | `UserSubmission`, `ConnectReport` | MISS | iso |
| Hébergement | `/mon-espace/hebergement` | `src/app/[locale]/mon-espace/hebergement/page.tsx` | `UserSubmission` (shelter) | RELIG | À généraliser |
| Parrainage | `/mon-espace/parrainage` | `src/app/[locale]/mon-espace/parrainage/page.tsx` | `ReferralCode`, `Referral` | MISS | iso |
| Badges | `/mon-espace/badges` | `src/app/[locale]/mon-espace/badges/page.tsx` | `UserActivityLog` | MISS | iso (gamification) |
| Timeline | `/mon-espace/timeline` | `src/app/[locale]/mon-espace/timeline/page.tsx` | `UserActivityLog` | MISS | iso |
| Confidentialité | `/mon-espace/confidentialite` | `src/app/[locale]/mon-espace/confidentialite/page.tsx` | `User.ghostMode` | MISS | iso |
| RGPD perso | `/mon-espace/rgpd` | `src/app/[locale]/mon-espace/rgpd/page.tsx` | `User` (export/delete) | MISS | iso |
| IA historique | `/mon-espace/ia/historique` | `src/app/[locale]/mon-espace/ia/historique/page.tsx` | `AIConversation` | MISS | iso |
| IA prompts | `/mon-espace/ia/prompts` | `src/app/[locale]/mon-espace/ia/prompts/page.tsx` | `Setting` | MISS | iso |
| Connect visibility | `/mon-espace/connect-visibility` | `src/app/[locale]/mon-espace/connect-visibility/page.tsx` | `ConnectProfile.showIn*` | RELIG | À généraliser |
| Sécurité | `/mon-espace/securite` | `src/app/[locale]/mon-espace/securite/page.tsx` | `UserMfa` | MISS | iso (2FA TOTP) |

### B.4 Pages RELIGIEUSES (à généraliser systématiquement)

| Page GLD | URL front | Composant | Données | Concept religieux | Status | Action |
|---|---|---|---|---|---|---|
| Cercles prière | `/cercles-priere` | `src/app/[locale]/cercles-priere/page.tsx` | `PrayerMessage`, `PrayerPresence` | Prière | RELIG | → `/cercles` ou `/communautes` génériques |
| Cercle détail | `/cercles-priere/[circle]` | `src/app/[locale]/cercles-priere/[circle]/page.tsx` | idem | Prière | RELIG | iso généralisé |
| Calendrier religieux | `/calendrier-religieux` | `src/app/[locale]/calendrier-religieux/page.tsx` | `ReligiousEvent`, `VenueParticipation` | Fêtes religieuses | RELIG | → `/calendrier-evenements` + catégories libres |
| Champ de prière | `/champ-de-priere` | `src/app/[locale]/champ-de-priere/page.tsx` | `PrayerCandle`, `PrayerIntention` | Bougie virtuelle | RELIG | → `/intentions-collectives` (gestes communautaires) |
| Camino (pèlerinage) | `/camino` | `src/app/[locale]/camino/page.tsx` | `CaminoPath`, `CaminoStep`, `CaminoContribution` | Pèlerinage | RELIG | → `/parcours-collectif` (challenges) |
| Textes sacrés | `/textes-sacres` | `src/app/[locale]/textes-sacres/page.tsx` | `SacredAnnotation` | Bible / Coran / Talmud | RELIG | → `/bibliotheque-annotee` (documents annotés) |
| Officiants | `/officiants` | `src/app/[locale]/officiants/page.tsx` | `InclusiveOfficiant`, `OfficiantBooking` | Prêtres / imams / rabbins | RELIG | → `/professionnels` ou `/experts` |
| Verset inclusif | `/verset-inclusif` | `src/app/[locale]/verset-inclusif/page.tsx` | `AIConversation` (verse tool) | Bible queer-friendly | RELIG | → `/citation-ia` (générateur citation) |
| Compagnon spirituel | `/compagnon-spirituel` | `src/app/[locale]/compagnon-spirituel/page.tsx` | `AIConversation`, `VocalPrayer` | Voice coach IA spirituel | RELIG | → `/coach-ia` (coach vocal) |
| Voice coach | `/voice-coach` | `src/app/[locale]/voice-coach/page.tsx` | `AIConversation`, `VocalPrayer` | Coach vocal IA | RELIG (peu) | iso "coach IA" |
| Témoignage IA | `/temoignage-ia` | `src/app/[locale]/temoignage-ia/page.tsx` | `AIConversation` | Générateur témoignage | MISS | iso "interview IA" |
| Webcams live | `/webcams-live` | `src/app/[locale]/webcams-live/page.tsx` | `WebcamSource` | Streams cultes | RELIG | → `/streams-live` (générique) |
| Lieux | `/lieux` | `src/app/[locale]/lieux/page.tsx` | `Venue` | Lieux LGBT-friendly | RELIG | → `/lieux` générique |
| Lieu détail | `/lieux/[slug]` | `src/app/[locale]/lieux/[slug]/page.tsx` | `Venue`, `Event`, `VenueCoupon` | idem | RELIG | iso |
| GLD local | `/gld-local` | `src/app/[locale]/gld-local/page.tsx` | `UserSubmission` (city-coordinator) | Coordinateurs locaux | RELIG | → `/chapitres` (chapters locaux) |
| GLD local ville | `/gld-local/[city]` | `src/app/[locale]/gld-local/[city]/page.tsx` | idem | idem | RELIG | iso |
| Voyage safe | `/voyage-safe` | `src/app/[locale]/voyage-safe/page.tsx` | (statique + UserSubmission) | Voyage LGBT | RELIG | → `/conseils-pratiques` (advice library) |
| SOS contacts | `/sos/contacts` | `src/app/[locale]/sos/contacts/page.tsx` | `Setting` | Hotlines LGBT | RELIG | → `/contacts-urgence` (configurable) |
| Aide juridique | `/aide-juridique` | `src/app/[locale]/aide-juridique/page.tsx` | `AIConversation` (legal) | Droit LGBT | RELIG | → `/assistant-juridique` |
| Signalement | `/signalement` | `src/app/[locale]/signalement/page.tsx` | `UserSubmission` (report-place) | Signaler discrimination | RELIG | → `/signalement` (form configurable) |
| Hébergement | `/hebergement` | `src/app/[locale]/hebergement/page.tsx` | `UserSubmission` (shelter) | Réseau hébergeurs | RELIG | → `/entraide-hebergement` |
| Membre Plus | `/membre-plus` | `src/app/[locale]/membre-plus/page.tsx` | `ConnectPremium`, Stripe | Pricing premium | OK concept | iso pricing page |
| Marketplace | `/marketplace` | `src/app/[locale]/marketplace/page.tsx` | `UserSubmission` (marketplace-artisan) | Artisans LGBT | RELIG | → `/marketplace` C2C générique |
| Crowdfunding | `/crowdfunding` | `src/app/[locale]/crowdfunding/page.tsx` | `UserSubmission` (crowdfunding-project) | Projets LGBT | RELIG | → `/crowdfunding` générique |
| Meetups | `/meetups` | `src/app/[locale]/meetups/page.tsx` | `Event`, `UserSubmission` (meetup-rsvp) | Rencontres LGBT | MISS | iso "rencontres communautaires" |
| Mentor | `/mentor` | `src/app/[locale]/mentor/page.tsx` | `UserSubmission` (mentor-*) | Mentorat LGBT | RELIG | → `/mentorat` générique |
| Mentor session | `/mentor/session/[room]` | `src/app/[locale]/mentor/session/[room]/page.tsx` | (visio LiveKit) | Visio mentor | MISS | iso visio room |
| Parrainage | `/parrainage` | `src/app/[locale]/parrainage/page.tsx` | `ReferralCode` | Code parrain | OK | iso |
| Journal public | `/journal` | `src/app/[locale]/journal/page.tsx` | `SoulEntry` | "GLD Soul" voix IA | RELIG | → `/journal-ia` (voix du site IA) |
| Wrapped | `/wrapped` | `src/app/[locale]/wrapped/page.tsx` | multi (stats user) | Année résumée | MISS | iso "year in review" |
| Mode calculatrice | `/mode-calculatrice` | `src/app/[locale]/mode-calculatrice/page.tsx` | (cacher site, mode "safe") | Mode discret LGBT | RELIG | → "mode discret" générique |
| Espace pro | `/espace-pro` | `src/app/[locale]/espace-pro/page.tsx` | `Venue` (owner) | Gérant venue LGBT | RELIG | iso (déjà coeur Pixeesite) |
| Espace pro Facebook | `/espace-pro/facebook-sync` | `src/app/[locale]/espace-pro/facebook-sync/page.tsx` | `Venue.facebookPageId`, `Event` | Import FB events | MISS | iso |

### B.5 Connect (réseau social interne) — 8 pages RELIG

| Page GLD | URL front | Composant | Données | Status | Action |
|---|---|---|---|---|---|
| Connect hub | `/connect` | `src/app/connect/page.tsx` | `ConnectProfile` | RELIG | → `/communaute` |
| Onboard | `/connect/onboard` | `src/app/connect/onboard/page.tsx` | `ConnectProfile` | RELIG | iso |
| Mur (feed) | `/connect/mur` | `src/app/connect/mur/page.tsx` | `ConnectPost`, `ConnectReaction` | RELIG | iso (social wall générique) |
| Pro (LinkedIn-like) | `/connect/pro` | `src/app/connect/pro/page.tsx` | `ConnectConnection`, `ConnectProfile` | RELIG | iso "annuaire pro" |
| Rencontres (Tinder-like) | `/connect/rencontres` | `src/app/connect/rencontres/page.tsx` | `ConnectSwipe`, `ConnectMatch` | RELIG | À retirer ou rendre opt-in (template "communauté avec dating") |
| Messages | `/connect/messages` | `src/app/connect/messages/page.tsx` | `ConnectConversation`, `ConnectMessage` | RELIG | iso "messagerie" |
| Conv | `/connect/messages/[convId]` | `src/app/connect/messages/[convId]/page.tsx` | idem | RELIG | iso |
| Premium success | `/connect/premium/success` | `src/app/connect/premium/success/page.tsx` | `ConnectPremium` | OK concept | iso |

### B.6 Totaux FRONT

- GLD front pages : **111**
- Déjà portées dans render Pixeesite : **9** (8 %)
- Manquantes pures : **35** (32 %)
- Religieux à généraliser : **35** (32 %)
- Sections Espace Membre à porter en bloc : **32** (29 %)

---

## C. Schéma DB — tables manquantes dans tenant.prisma Pixeesite

### C.1 Tables OK (déjà présentes iso dans tenant.prisma)

`SitePage, Lead, LeadInteraction, FormConfig, FormSubmission, Article, Newsletter, EmailTemplate, MailAccount, Product, Order, OrderItem, Asset, Task, ForumCategory, ForumThread, ForumPost, SitemapEntry, TenantDomain, TwoFactorSecret, Event, Coupon, Testimonial, YoutubeVideo, Banner, MapLocation, ModerationItem, Poster, NewsletterPlan, SocialPost, RichPage, Partner` (32 modèles)

Tables ajoutées via `tenant-init.ts` mais absentes du `.prisma` : `ScraperJob, AiAutopilotRule, AiManual, RagSource, RagChunk, TelegramAlert, IntegrationConfig, Theme, FeatureFlag, Translation` → à intégrer au .prisma pour cohérence Prisma client.

### C.2 Tables GLD MANQUANTES dans tenant Pixeesite (à créer)

Total à créer : **48 modèles + 8 enums**.

#### Identité & User (cœur)
| Modèle GLD | Usage dans GLD | Migration tenant proposée |
|---|---|---|
| `User` (étendu : bio, identity, traditions, dashboardTheme, banner*) | Profil membre riche | Ajouter `TenantUser` ou étendre auth platform DB |
| `Bookmark` | Favoris cross-resource | iso |
| `JournalEntry` | Journal intime privé | iso |
| `FutureLetter` | Lettre soi-futur | iso |
| `AIConversation` | Convs IA sauvées | iso |
| `UserActivityLog` | Timeline user | iso |
| `UserMenuOverride` | Override menu admin per-user | iso |
| `VocalPrayer` | Audio + transcription IA | → `VocalEntry` générique |
| `UserMfa` | 2FA TOTP | iso |
| `SmsCode` | SMS one-time | iso (Twilio) |
| `LoginAttempt` | Anti-lockout | iso |

#### CMS & Pages
| Modèle GLD | Migration tenant proposée |
|---|---|
| `Page` (multi-locale Json content) | Iso ou fusion avec `RichPage` |
| `Section` (section riche d'une page éditoriale) | Iso (sections empilées) |
| `MenuItem` (nav arborescente) | Iso |
| `PageBlock` (drag-drop builder) | Iso (déjà SitePage.blocks Json mais granulaire) |
| `Setting` (key-value) | Iso |

#### Communauté / Forum / Témoignage
| Modèle GLD | Migration tenant proposée |
|---|---|
| `VideoTestimony` (avec sous-titres multi-locale) | Étendre `Testimonial` avec `subtitles*` |
| `PhotoComment` | iso |
| `ProductReview` | iso |
| `Wishlist` | iso |
| `StockAlert` | iso |
| `LoyaltyAccount` + `LoyaltyLedger` | iso |
| `ProductVariant` | iso (variants détaillés) |
| `ReferralCode` + `Referral` | iso |
| `ModerationDecision` | iso (étendre `ModerationItem`) |

#### Connect (réseau social interne)
| Modèle GLD | Migration tenant proposée |
|---|---|
| `ConnectProfile` | iso "CommunityProfile" |
| `ConnectSwipe` + `ConnectMatch` | iso (opt-in par template) |
| `ConnectConnection` (pro LinkedIn-like) | iso |
| `ConnectPost` + `ConnectReaction` | iso (wall social) |
| `ConnectConversation` + `ConnectMessage` | iso (DM) |
| `ConnectReport` + `ConnectBlock` | iso (modération sociale) |
| `ConnectPremium` | iso (Stripe sub) |

#### Carte & Lieux (RELIG → générique)
| Modèle GLD | Migration tenant proposée |
|---|---|
| `Venue` (39 champs, énorme) | Étendre `MapLocation` (ratings, owner, enrichmentSources, hours, social, FB sync) |
| `VenueCoupon` | iso (couplé MapLocation) |
| `VenueParticipation` (lien venue ↔ ReligiousEvent) | → `LocationEventParticipation` générique |
| `enum VenueType` (24 valeurs religieuses) | → champ string libre `category` |
| `enum VenueRating` | → `tags` ou enum générique (FRIENDLY/CAUTION/etc.) |

#### Évènements religieux (RELIG → générique)
| Modèle GLD | Migration tenant proposée |
|---|---|
| `ReligiousEvent` | → `CalendarOccasion` (slug + faith=`category`, dateMode `fixed`/`computed`) |

#### Prière / Bougies / Pèlerinage (RELIG → générique)
| Modèle GLD | Migration tenant proposée |
|---|---|
| `PrayerMessage` | → `CircleMessage` (chat de cercle communautaire) |
| `PrayerCandle` | → `CommunityGesture` (geste géolocalisé 24h) |
| `PrayerIntention` | → `CommunityIntention` (intention partagée) |
| `PrayerPresence` | → `CirclePresence` (présence live) |
| `CaminoPath` + `CaminoStep` + `CaminoContribution` | → `CollectiveJourney` + `JourneyStep` + `JourneyContribution` |
| `SacredAnnotation` | → `DocumentAnnotation` (annotation collaborative d'un document) |
| `InclusiveOfficiant` + `OfficiantBooking` | → `Professional` + `ProfessionalBooking` |

#### Photos UGC
| Modèle GLD | Migration tenant proposée |
|---|---|
| `Photo` + enums `PhotoStatus`, `PlaceType`, `Source` | → `UserPhoto` (UGC avec modération + géoloc) |

#### IA / RAG / Avatar
| Modèle GLD | Migration tenant proposée |
|---|---|
| `KnowledgeDoc` + `KnowledgeChunk` + `UnansweredQuery` | → fusionner avec `RagSource`/`RagChunk` (déjà en init) |
| `SoulEntry` (journal IA quotidien) | → `SiteJournal` (voix du site IA) |
| `Manual` (manuels IA) | iso `AiManual` (déjà en init) |
| `Avatar` + `AvatarGeneration` | iso |
| `WebcamSource` | → `LiveStream` (cache vidéos live) |

#### Plateforme / DevOps / Sécurité
| Modèle GLD | Migration tenant proposée |
|---|---|
| `AdminInvitation` | iso (déjà magic-link platform-level) |
| `ClaudeSession` + `ClaudeMessage` + `ClaudeApproval` | iso (DevOps autopilot) |
| `EmailLog` | iso (logs Resend) |
| `TelegramMessage` | iso (déjà `TelegramAlert` en init) |
| `AuditLog` | iso |
| `PageView` (analytics interne) | iso |
| `ScheduledPost` | iso (déjà `SocialPost`) |
| `Theme` (animation auto-saisonnière) | iso (déjà en init, étendre auto-activation + holidaySlug + musicUrl) |

#### Submissions multi-formulaires
| Modèle GLD | Migration tenant proposée |
|---|---|
| `UserSubmission` (kind=mentor/shelter/marketplace/crowdfunding/...) | iso `FormSubmission` (déjà tenant) avec `kind` |
| `PeerHelp` + `PeerHelpResponse` | iso "community help threads" |

#### E-commerce avancé
| Modèle GLD | Migration tenant proposée |
|---|---|
| `PriceWatch` + `CompetitorProduct` + `PriceSnapshot` | iso (comparateur de prix B2B) |
| `TariffSource` + `TariffImport` | iso (import grilles tarifs) |

#### Newsletter avancée
| Modèle GLD | Migration tenant proposée |
|---|---|
| `NewsletterSubscriber` + enum `SubscriberStatus` | → `Lead.newsletterOptIn` + `Lead.status` (déjà couvert) |
| `NewsletterCampaign` + enum `CampaignStatus` | iso `Newsletter` (déjà tenant, ajouter fields manquants) |

### C.3 Migration recommandée

Procédure :
1. Étendre `tenant.prisma` avec les 48 nouveaux modèles
2. Régénérer le Prisma client tenant
3. Mettre à jour `tenant-init.ts` avec les CREATE TABLE correspondants
4. Créer un script de migration `pnpm tenant:migrate <orgId>` qui rejoue `ensureTenantTables` sur chaque DB tenant existante

---

## D. Concepts religieux à généraliser

Tableau de mapping concept GLD → concept générique → adaptation IA par thème.

| # | Concept GLD | Champ DB | Concept générique proposé | Adaptation IA par thème |
|---|---|---|---|---|
| 1 | "Prière" (cercles, intentions, bougies) | `PrayerCandle.intention`, `PrayerIntention.text`, `PrayerMessage.message` | "Geste communautaire" / "intention partagée" | photographe → "souhait inspiration"; restau → "voeu pour l'équipe"; coach → "intention de la semaine"; podcast → "message à la communauté" |
| 2 | "Cercle de prière" (catholique, musulman, juif...) | `PrayerCandle.faith`, `PrayerPresence.circle`, `PrayerMessage.circle` | "Cercle communautaire" / "salon thématique" | photographe → "cercle paysage / portrait / mariage"; restau → "cercle clients / fournisseurs"; coach → "cercle débutants / avancés"; podcast → "cercle saison 1 / 2" |
| 3 | "Confession" / "tradition" | `User.traditions[]`, `ConnectProfile.traditions[]`, `Venue.type=CHURCH_CATHOLIC/MOSQUE/...` | "Catégorie thématique" / "domaine d'expertise" / "spécialité" | photographe → ["mariage","portrait","corporate"]; restau → ["italien","végétarien","brunch"]; coach → ["vie","carrière","santé"]; asso → ["jeunes","seniors","sport"] |
| 4 | "Officiant·e religieux" (prêtre, imam, rabbin) | `InclusiveOfficiant.role`, `InclusiveOfficiant.faith` | "Professionnel·le" / "expert·e" | photographe → "photographe certifié"; restau → "chef invité"; coach → "coach certifié"; immobilier → "agent certifié" |
| 5 | "Texte sacré" (Bible, Coran, Talmud, Vedas) | `SacredAnnotation.scripture`, `SacredAnnotation.reference` | "Document annoté" / "source de référence" | photographe → "manuel technique annoté"; restau → "carte commentée"; podcast → "transcription annotée"; agence → "guide méthodo annoté" |
| 6 | "Pèlerinage" (Compostelle, Mecque, Bénarès) | `CaminoPath.name`, `CaminoPath.faith`, `CaminoStep` | "Parcours collectif" / "challenge communautaire" / "roadmap" | photographe → "challenge 30 jours photo"; restau → "tournée des saisons"; coach → "programme 12 semaines"; e-commerce → "saison des soldes" |
| 7 | "Fête religieuse" (Pâques, Ramadan, Diwali) | `ReligiousEvent.faith`, `ReligiousEvent.category` | "Occasion calendaire" / "saison thématique" | photographe → "saison mariages"; restau → "saint-valentin / brunch"; coach → "rentrée"; asso → "journée nationale X"; e-commerce → "soldes / black friday" |
| 8 | "Lieu de culte" (église, mosquée, synagogue) | `Venue.type` enum 24 valeurs | "Lieu" / "établissement" / "point de vente" | photographe → "studio / atelier"; restau → "restaurant / food-truck"; coach → "cabinet"; immobilier → "agence"; podcast → "studio enregistrement" |
| 9 | "Webcam culte live" | `WebcamSource.faith`, `WebcamSource.schedule` | "Diffusion live" / "stream" | photographe → "live shooting"; restau → "live cuisine"; coach → "live session"; podcast → "live recording" |
| 10 | "Verset inclusif" (page IA générant verset queer) | `AIConversation.tool="verse"` | "Citation thématique" / "punchline" | photographe → "citation inspiration"; restau → "punchline du jour"; coach → "mantra"; podcast → "phrase d'ouverture" |
| 11 | "Voice coach spirituel" / "Compagnon spirituel" | `AIConversation.tool="voice-coach"` | "Coach IA conversationnel" | photographe → "assistant créatif"; restau → "assistant menu"; coach → "outil intro client"; agence → "assistant brief" |
| 12 | "Témoignage video LGBT" | `VideoTestimony` | "Témoignage client" / "case study" | photographe → "témoignage couple"; restau → "avis client filmé"; coach → "transformation"; agence → "case study client" |
| 13 | "GLD Local" (chapitres LGBT par ville) | `gld-local/[city]` | "Chapitres locaux" / "antennes" | photographe → "studios partenaires par ville"; restau → "franchise par ville"; coach → "praticiens par ville"; asso → "antennes locales" |
| 14 | "Mode calculatrice" (camouflage anti-discrimination) | `mode-calculatrice/page.tsx` | "Mode discret" / "kiosk mode" | photographe → "mode présentation client"; restau → "mode service"; coach → "mode session"; iPad/kiosk borne |
| 15 | "Voyage safe" (pays LGBT-friendly) | `voyage-safe/page.tsx` | "Conseils pratiques" / "bibliothèque ressources" | photographe → "guides location/voyage de mariage"; restau → "guides ouverture"; coach → "guides certif"; e-commerce → "guides douanes" |
| 16 | "Hébergement d'urgence LGBT" | `UserSubmission.kind="shelter-*"` | "Entraide communautaire" / "demandes & offres" | restau → "remplacement chef d'urgence"; coach → "match urgences perso"; agence → "freelance dispo"; asso → "logement militants" |
| 17 | "SOS Contacts" / "Hotlines" | `sos/contacts/page.tsx` | "Contacts urgence" / "ressources critiques" | photographe → "contacts dépannage matos"; restau → "contacts livreurs / dépannage frigo"; coach → "réseau confrères urgences"; agence → "prestataires urgence" |
| 18 | "Aide juridique LGBT" | `AIConversation.tool="legal"` | "Assistant juridique" | photographe → "droits d'image"; restau → "conformité hygiène"; coach → "RGPD coaching"; e-commerce → "CGV / réclamations" |
| 19 | "Officiant·e mariage LGBT" | `OfficiantBooking` | "Réservation prestation" | photographe → "réservation séance"; restau → "réservation table"; coach → "réservation session"; agence → "réservation rdv" |
| 20 | "Connect Rencontres" (Tinder LGBT) | `ConnectSwipe`, `ConnectMatch` | Désactivable par template (opt-in) | À activer uniquement pour template "communauté + dating"; absent par défaut |
| 21 | "Connect Pro" (LinkedIn LGBT-friendly) | `ConnectConnection`, `ConnectProfile.proCategory` | "Annuaire pro" / "réseau B2B" | photographe → "réseau prestataires mariage"; restau → "réseau fournisseurs locaux"; coach → "réseau confrères"; agence → "réseau partenaires" |
| 22 | "Connect Mur" (feed social) | `ConnectPost` | "Wall communauté" / "feed social interne" | iso (chaque template peut activer) |
| 23 | "Champ de prière" (bougies sur carte mondiale) | `PrayerCandle` (lat/lng + 24h) | "Carte d'intentions" / "carte gestes communauté" | photographe → "carte photos du jour"; restau → "carte plats du jour livrés"; coach → "carte progressions client"; asso → "carte actions terrain" |
| 24 | "Journal Soul" (voix IA quotidienne du site) | `SoulEntry` | "Voix du site" / "journal éditorial IA" | photographe → "humeur du jour du studio"; restau → "menu du jour narré"; coach → "réflexion du jour"; podcast → "édito quotidien" |
| 25 | "Verset arc-en-ciel" / "Pride banner" | `Theme.slug="pride"`, `Banner.presetSlug="pride"` | "Saison communauté" / "campagne identitaire" | photographe → "saison anniversaire studio"; restau → "saison ouverture"; coach → "lancement programme"; e-commerce → "saison anniversaire marque" |
| 26 | "ghostMode" (mode discret) | `User.ghostMode` | "Mode confidentiel" | iso (cacher activité publique) |
| 27 | "GLD Connect Premium" (Stripe) | `ConnectPremium` | "Membre premium" / "abonné·e VIP" | iso (template-agnostique) |
| 28 | "Telegram bot religieux" | `TelegramMessage`, `TelegramAlert` | "Bot client / community manager" | iso (généralisable) |

---

## E. Plan d'exécution en phases

Phases regroupées par cohérence thématique. Effort estimé en **heures sub-agent** (à 100 LOC/h équivalent porté).

### Phase 1 — DB tenant complète (foundation)

**Objectif** : combler les 48 modèles manquants dans `tenant.prisma` + tenant-init.ts.

- Modèles à ajouter : tous ceux listés section C.2
- LOC estimé : ~1 800 lignes prisma + 1 200 lignes init SQL
- Dépendances : aucune (foundation)
- Effort : **30 h sub-agent**

### Phase 2 — Espace Membre (mon-espace)

**Objectif** : porter les 32 pages `/mon-espace/*` en bloc, avec auth tenant.

- Modules : User étendu, Bookmark, JournalEntry, FutureLetter, AIConversation, UserActivityLog, Wishlist, ProductReview, ReferralCode, UserMfa
- Pages à créer dans render : 32 pages
- LOC estimé : ~6 000 lignes (200 LOC/page moy.)
- Dépendances : Phase 1 (User étendu, Bookmark, Journal, etc.)
- Effort : **60 h sub-agent**

### Phase 3 — E-commerce complet (boutique, panier, dropshipping, reviews)

**Objectif** : compléter le shop iso GLD (variants, reviews, wishlist, loyalty, suivi commande publique).

- Modules : Product (étendu variants), ProductVariant, ProductReview, Wishlist, StockAlert, LoyaltyAccount, LoyaltyLedger, Order (variants), publicToken track page
- Pages front : `/panier`, `/boutique/merci`, `/commande/[token]`, `/mon-espace/commandes`, `/mon-espace/wishlist`, `/mon-espace/avis`
- Admin : dropshipping (déjà OK), reviews moderation, loyalty config
- LOC estimé : ~3 500
- Dépendances : Phase 1 (ProductVariant, Wishlist, Loyalty*)
- Effort : **35 h sub-agent**

### Phase 4 — Forum complet + modération IA

**Objectif** : iso forum (catégorie page, nouveau thread, replies imbriquées, modération auto Gemini).

- Pages front : `/forum/[category]`, `/forum/nouveau` à ajouter
- Modération : `ModerationDecision` storage + IA score routing
- Admin : moderation page OK
- LOC estimé : ~1 500
- Dépendances : Phase 1 (ModerationDecision)
- Effort : **15 h sub-agent**

### Phase 5 — Carte + Lieux + Événements (généralisation Venue → MapLocation étendue)

**Objectif** : front `/carte`, `/lieux`, `/lieux/[slug]`, `/agenda` + admin venues iso.

- Modèle clé : étendre `MapLocation` (39 champs Venue), ajouter `Event` (déjà tenant), `LocationEventParticipation`, `LocationCoupon`
- Pages front : 4 pages render
- Admin : `establishments/page.tsx` à fusionner avec `map/page.tsx`
- Enrichissement IA : Gemini grounded search (placeId, hours, photos, social)
- LOC estimé : ~3 000
- Dépendances : Phase 1 (MapLocation étendu, LocationCoupon)
- Effort : **30 h sub-agent**

### Phase 6 — Communauté sociale (Connect généralisé)

**Objectif** : porter `/connect/*` en module opt-in "Community Suite" (wall, pro, messagerie, dating optionnel).

- Modèles : CommunityProfile (ex ConnectProfile), CommunityPost, CommunityReaction, CommunityConnection (LinkedIn-like), CommunityConversation, CommunityMessage, CommunityReport, CommunityBlock, CommunityPremium
- Sous-module dating (opt-in) : CommunitySwipe, CommunityMatch
- Pages front : 8 pages
- Admin : connect/moderation page à généraliser
- LOC estimé : ~5 000
- Dépendances : Phase 1 (Community* models)
- Effort : **50 h sub-agent**

### Phase 7 — Témoignages, Galerie, Photos UGC

**Objectif** : VideoTestimony étendu (sous-titres multi-locale), Photo UGC avec modération.

- Modèles : étendre `Testimonial` (subtitlesFr/En/Es/Pt, transcription), ajouter `UserPhoto` + `PhotoComment`
- Pages front : `/temoignages`, `/galerie`, `/photo/[id]`, `/mon-espace/photos`, `/mon-espace/temoignages`
- LOC estimé : ~2 500
- Dépendances : Phase 1, Phase 2 (mon-espace)
- Effort : **25 h sub-agent**

### Phase 8 — Pages éditoriales + Sections + Page Builder

**Objectif** : permettre à l'IA de générer toute la pile éditoriale (argumentaire, message, a-propos, participer) iso GLD via blocs.

- Modèles : `Section` (sections empilées d'une page éditoriale), `PageBlock` (drag-drop builder déjà partiel)
- Pages front : `/argumentaire`, `/message`, `/participer`, `/partager`, `/a-propos` (toutes section-based)
- Admin : `content/page.tsx` hub + `home/page.tsx` builder dédié
- LOC estimé : ~2 800
- Dépendances : Phase 1 (Section model)
- Effort : **28 h sub-agent**

### Phase 9 — Calendrier + Intentions + Parcours collectifs (généralisation RELIG)

**Objectif** : généraliser ReligiousEvent → CalendarOccasion, PrayerCandle → CommunityGesture, CaminoPath → CollectiveJourney.

- Modèles : CalendarOccasion, CommunityGesture (carte 24h), CommunityIntention, CirclePresence, CircleMessage, CollectiveJourney + JourneyStep + JourneyContribution, DocumentAnnotation
- Pages front : `/calendrier-evenements` (ex calendrier-religieux), `/intentions-collectives` (ex champ-de-priere), `/parcours-collectif` (ex camino), `/bibliotheque-annotee` (ex textes-sacres), `/cercles` (ex cercles-priere), `/professionnels` (ex officiants)
- LOC estimé : ~5 500
- Dépendances : Phase 1 (8 modèles community)
- Effort : **55 h sub-agent**

### Phase 10 — Module IA complet (RAG + Voice + Avatar + Soul)

**Objectif** : assembler la suite IA iso GLD (RAG knowledge, voice coach, avatar studio, journal IA).

- Modèles : KnowledgeDoc + KnowledgeChunk (fusion avec RagSource/RagChunk), AIConversation, VocalPrayer (→ VocalEntry), Avatar + AvatarGeneration, SoulEntry (→ SiteJournal), Manual (→ AiManual)
- Pages front : `/coach-ia`, `/citation-ia`, `/assistant-juridique`, `/journal-ia`, `/temoignage-ia`
- Admin : ai/knowledge/* hub, avatar-studio, manuals, ai-autopilot
- Providers : Gemini, OpenAI, Anthropic, Mistral, Groq, Tavus, Heygen, Avatar V
- LOC estimé : ~6 500
- Dépendances : Phase 1
- Effort : **65 h sub-agent**

### Phase 11 — DevOps Suite (Claude workspace, vscode, time-machine, secrets, autopilot)

**Objectif** : porter la suite DevOps admin iso GLD (Claude Code SDK in-browser, code-server, autopilot rules, audit logs).

- Modèles : ClaudeSession, ClaudeMessage, ClaudeApproval, AuditLog, AdminInvitation
- Pages admin : claude-cli, claude-workspace, vscode-online, time-machine, secrets, ai-autopilot, invitations
- LOC estimé : ~4 000
- Dépendances : Phase 1, Telegram bot
- Effort : **40 h sub-agent**

### Phase 12 — Sécurité & Auth avancée (2FA, SMS, lockout, magic-link invits)

**Objectif** : compléter sécurité iso GLD.

- Modèles : UserMfa, SmsCode, LoginAttempt, AdminInvitation
- Pages admin : security-2fa, security-settings, invitations
- Pages front : `/mon-espace/securite`
- Intégrations : Twilio SMS, otplib TOTP, magic-link invits
- LOC estimé : ~2 200
- Dépendances : Phase 1
- Effort : **22 h sub-agent**

### Phase 13 — Newsletter avancée (archives publiques, plan annuel, segments)

**Objectif** : compléter newsletter iso GLD (archives publiques, plan année par mois IA).

- Modèles : étendre Newsletter (segments, opens, clicks), NewsletterPlan (déjà OK), EmailLog
- Pages front : `/newsletters` archives, `/newsletters/[id]`
- Admin : newsletter/plan complet IA
- LOC estimé : ~1 800
- Dépendances : Phase 1
- Effort : **18 h sub-agent**

### Phase 14 — Themes auto-saisonniers + ambiance audio + holidays

**Objectif** : compléter Theme model iso GLD (auto-activation calendrier, music, decorations).

- Modèle : Theme étendu (holidaySlug, autoStart*, musicUrl, decorations, customCss, geographicScope)
- Admin : themes/page.tsx complet, ai-theme (génération IA)
- Calendrier des fêtes : data file `holiday-calendar.json` (Pâques, Pessah, Ramadan, Diwali, Pride, Noël, Halloween, Valentin, Black Friday, etc.)
- LOC estimé : ~2 500
- Dépendances : Phase 1, Phase 9 (CalendarOccasion)
- Effort : **25 h sub-agent**

### Phase 15 — E-commerce avancé (comparateur prix, tarifs fournisseurs)

**Objectif** : porter modules B2B avancés.

- Modèles : PriceWatch, CompetitorProduct, PriceSnapshot, TariffSource, TariffImport
- Pages admin : prices, prices/[id], tariffs
- Scraping : worker dédié + cron
- LOC estimé : ~4 500
- Dépendances : Phase 1, Phase 3
- Effort : **45 h sub-agent**

### Phase 16 — Submissions multi-formulaires + PeerHelp

**Objectif** : iso UserSubmission generic, PeerHelp threads.

- Modèles : étendre `FormSubmission` (déjà tenant) avec `kind`, ajouter PeerHelp + PeerHelpResponse
- Pages front : `/hebergement`, `/marketplace`, `/crowdfunding`, `/meetups`, `/mentor`, `/signalement`
- Admin : submissions hub multi-kind
- LOC estimé : ~2 800
- Dépendances : Phase 1
- Effort : **28 h sub-agent**

### Phase 17 — Embed widgets + Wrapped + Coming-soon

**Objectif** : modules secondaires.

- Pages : `/embed/[topic]`, `/wrapped`, `/coming-soon/[feature]`, `/demo-parallax-photo`
- LOC estimé : ~1 200
- Dépendances : Phases 1-10
- Effort : **12 h sub-agent**

### Phase 18 — GLD Local / Chapitres / Mode discret

**Objectif** : iso modules locaux.

- Pages : `/gld-local`, `/gld-local/[city]`, `/mode-calculatrice`, `/sos/contacts`, `/voyage-safe`
- Modèles : `LocalChapter` (ex GLD Local), `EmergencyContact` (ex SOS), `SafetyAdvice` (ex voyage-safe)
- LOC estimé : ~2 000
- Dépendances : Phase 1
- Effort : **20 h sub-agent**

### Phase 19 — Webcams Live + Streams

**Objectif** : iso WebcamSource → LiveStream générique.

- Modèle : `LiveStream` (cache résolution + AI discovery cron)
- Page front : `/streams-live`
- Admin : (intégré dans content hub)
- Intégration : YouTube Data API, AI cron de découverte
- LOC estimé : ~1 500
- Dépendances : Phase 1
- Effort : **15 h sub-agent**

### Phase 20 — Templates marketplace (11 templates iso GLD thémés)

**Objectif** : pré-générer 11 templates Pixeesite cohérents iso GLD mais thémés différemment.

Templates à pré-générer dans `/dashboard/orgs/[slug]/templates/page.tsx` :
1. **Photographe** (portfolio + agenda séances + shop tirages + témoignages clients)
2. **Restaurant** (carte + réservation + agenda événements + reviews + dropshipping merch)
3. **Coach / Thérapeute** (sessions + agenda + RAG méthodo + voice coach + reviews)
4. **Podcast** (épisodes + RAG transcriptions + newsletter + community wall + sponsors)
5. **Association** (membres + agenda + don + témoignages + chapitres locaux)
6. **École / Formation** (cours + agenda + RAG ressources + parrainage + community)
7. **Agence créative** (case studies + équipe + community pro + leads + newsletter)
8. **Immobilier** (annonces + carte + agenda visites + leads + comparateur prix)
9. **E-commerce** (shop + dropshipping + reviews + wishlist + loyalty + newsletter)
10. **Link-in-bio** (page builder + agenda + shop + newsletter)
11. **Blog / Media** (articles + RAG + newsletter + community + sponsors)

- LOC estimé : ~3 500 (config JSON par template + seeds)
- Dépendances : toutes phases précédentes
- Effort : **35 h sub-agent**

### Estimation totale globale

| Phase | Heures sub-agent |
|---|---|
| 1. DB tenant complète | 30 |
| 2. Espace Membre | 60 |
| 3. E-commerce complet | 35 |
| 4. Forum complet | 15 |
| 5. Carte + Lieux + Événements | 30 |
| 6. Communauté sociale | 50 |
| 7. Témoignages + Galerie | 25 |
| 8. Pages éditoriales | 28 |
| 9. Calendrier + Intentions (généralisation RELIG) | 55 |
| 10. Module IA complet | 65 |
| 11. DevOps Suite | 40 |
| 12. Sécurité & Auth | 22 |
| 13. Newsletter avancée | 18 |
| 14. Themes auto-saisonniers | 25 |
| 15. E-commerce avancé | 45 |
| 16. Submissions + PeerHelp | 28 |
| 17. Embed/Wrapped/Coming-soon | 12 |
| 18. Chapitres locaux / Mode discret | 20 |
| 19. Webcams Live | 15 |
| 20. Templates marketplace 11 thémés | 35 |
| **TOTAL** | **653 h sub-agent** |

À raison d'une orchestration parallèle sur 4 phases simultanées et d'un facteur de batch (review + tests) ~1,3x, on obtient un calendrier réel d'environ **210 h calendaires sub-agent** soit **5-6 semaines** à plein régime, ou **8-10 semaines** en concurrence avec maintenance GLD.

---

## F. Stratégie "coquille vide" + adaptation IA

### F.1 Structure code thème-agnostique

**Principe directeur** : aucun champ DB ni texte UI ne doit nommer un concept religieux. Tout passe par :

1. **Champs DB neutres** :
   - `category` (string libre) au lieu de `faith` ou `tradition`
   - `theme` (slug) au lieu de `religiousTheme`
   - `audience` (string libre) au lieu de `congregation`
   - `kind` (discriminator string) au lieu de types enum spécifiques
   - `tags[]` au lieu d'enums fermés

2. **Convention de naming des modèles** :
   - `Community*` au lieu de `Connect*` (réseau social)
   - `Calendar*` au lieu de `Religious*`
   - `Circle*` au lieu de `Prayer*`
   - `Journey*` au lieu de `Camino*`
   - `Professional*` au lieu de `Officiant*`
   - `Gesture*` au lieu de `Candle*`
   - `Annotation*` au lieu de `SacredAnnotation*`

3. **Pages routes neutres** :
   - `/communaute` au lieu de `/connect`
   - `/cercles` au lieu de `/cercles-priere`
   - `/calendrier` au lieu de `/calendrier-religieux`
   - `/intentions` au lieu de `/champ-de-priere`
   - `/parcours` au lieu de `/camino`
   - `/professionnels` au lieu de `/officiants`
   - `/bibliotheque` au lieu de `/textes-sacres`

4. **Textes UI via i18n + dictionnaire de remplacement par template** :
   - Tous les libellés passent par `t('community.circle.title')` avec dictionnaire fourni par le template choisi
   - Le template "photographe" remplace `community.circle.title` par "Cercle de pratique" ; le template "religion" par "Cercle de prière"

5. **Composants visuels paramétrables** :
   - `<CommunityCard category={...}>` ; le rendu (icône, couleur, emoji) est déterminé par `category` lu dans la config du template, pas hard-codé

### F.2 Adaptation IA par thème (Studio IA Pixeesite)

Le **Studio IA** (déjà présent dans `apps/admin/src/app/dashboard/orgs/[slug]/ai-theme/page.tsx`) doit, à partir d'un **brief** (texte libre du client), :

1. **Choisir le template de base** parmi les 11 (photographe / restau / coach / podcast / asso / école / agence / immobilier / e-commerce / link-in-bio / blog)
2. **Générer le dictionnaire i18n** :
   - Mapper chaque clé générique (`community.circle.title`, `intention.title`, etc.) au libellé spécifique du métier client
   - Stocker dans `Translation` (tenant DB)
3. **Choisir la palette + typo + animations** :
   - `Theme.palette`, `Theme.fonts`, `Theme.blocks` initial state
4. **Générer le contenu seed** :
   - 5-10 SitePage avec blocs représentatifs
   - 10-30 Article seed pour le blog
   - 5-15 Event seed pour l'agenda
   - 3-5 Testimonial seed
   - 5-10 Partner seed (logos placeholders)
   - 1 Banner seed (hero)
5. **Activer les modules pertinents via FeatureFlag** :
   - photographe → shop=ON, dropship=ON, dating=OFF, prayer-circles=OFF
   - restau → shop=OFF (ou merch only), reservation=ON, calendar=ON
   - coach → shop=OFF, voice-coach=ON, reviews=ON, mentor=ON
   - asso → don=ON, chapitres=ON, témoignages=ON, community=ON

### F.3 Marketplace de templates iso GLD

Stockage : `apps/admin/src/app/dashboard/orgs/[slug]/templates/page.tsx` + `packages/templates/` (nouveau package).

Chaque template = JSON dossier :
```
packages/templates/photographe/
├── manifest.json          (nom, description, modules activés, palette défaut)
├── i18n.fr.json           (dictionnaire i18n complet)
├── seeds/
│   ├── pages.json         (SitePage seeds)
│   ├── articles.json      (Article seeds)
│   ├── testimonials.json
│   └── partners.json
├── theme.json             (Theme initial)
└── prompts/
    └── ai-brief.txt       (prompt système pour Studio IA quand ce template est choisi)
```

L'admin du SaaS peut :
- Sélectionner un template lors de la création d'org/site
- Le Studio IA pré-remplit le brief et propose des variantes
- 1 clic = clone du template avec adaptation IA au brief
- Switch de template à chaud possible (préserve les données utilisateur, change palette + i18n + structure SitePage)

### F.4 Onboarding utilisateur Pixeesite (workflow recommandé)

1. Inscription `apps/admin/src/app/signup/page.tsx`
2. Onboarding `apps/admin/src/app/onboarding/page.tsx` :
   - Q1 : "Quel est votre projet ?" (texte libre + 11 chips templates suggérés)
   - Q2 : "Quelle audience visez-vous ?"
   - Q3 : "Avez-vous déjà un nom de domaine ?"
3. IA propose un template + palette + seed initial
4. Création org + tenant DB + ensureTenantTables
5. Génération initiale via Studio IA (palette, i18n, seeds)
6. Redirect dashboard org

### F.5 Garde-fous

- **Aucun champ DB renommé après seed** sans script de migration (`pnpm template:switch`)
- **Données utilisateur préservées** : Lead/Order/User restent intactes, seul le "habillage" change (Theme, Translation, SitePage)
- **Templates versionnés** dans Git pour rollback
- **i18n fallback** : si une clé manque dans le dictionnaire du template, fallback sur clé générique anglaise

---

## RÉSUMÉ EXÉCUTIF

- **Total pages admin GLD** : 82
- **Total pages front GLD** : 111 (incluant 32 pages /mon-espace, 8 /connect, 1 /embed)
- **Total pages GLD** : 193
- **Déjà portées dans Pixeesite (OK)** : 49 admin + 9 front = **58 (30 %)**
- **Manquantes pures (MISS)** : 9 admin + 35 front = **44 (23 %)**
- **Partiellement portées (PART)** : 18 admin + 32 mon-espace squelette = **50 (26 %)**
- **Religieux à généraliser (RELIG)** : 6 admin + 35 front = **41 (21 %)**
- **Modèles DB tenant à créer** : 48 modèles + 8 enums
- **Estimation totale effort iso complet** : **653 h sub-agent** (≈ 5-6 semaines à 4 phases parallèles, 8-10 semaines en concurrence avec maintenance GLD)
- **11 templates marketplace cibles** : photographe, restau, coach, podcast, asso, école, agence, immobilier, e-commerce, link-in-bio, blog
