# 🏗️ Plan — SaaS Site Builder multi-tenant ("Pixeesite" / Webflow-killer)

> **Vision** : un site-builder SaaS niveau Webflow / Framer / Wix.
> 1 back-office central (le tien) → N sites clients (chacun avec sa DB,
> son domaine, son style, son contenu) → publication automatique sur
> Coolify avec déploiement par client.
>
> **USPs** (ce qui te différencie de Webflow) :
> 1. **AI-first end-to-end** — gen text + image + video + parallax PNG
>    transparents + audio (ElevenLabs) intégrés nativement
> 2. **100 effets wahoo** déjà packagés (Parallax Stepout, Slider artistique,
>    glitch, neon, mask-reveal, holographic…)
> 3. **Self-hostable** sur Coolify ou Vercel — pas de vendor lock-in
> 4. **Open-core** — composants core open source, plugins premium
> 5. **Tarif EU** (€), serveurs EU (RGPD), assistance francophone

---

## 1. 🎯 Personas & cas d'usage

### Persona A — Photographe indépendant·e
- Veut un portfolio + booking + témoignages + blog
- Budget : 15-29 €/mois
- Plan : **Solo**

### Persona B — Petite agence / freelance dev
- Gère 5-30 sites de clients (sites vitrines, e-commerce simple)
- Veut des templates, white-label, factures auto
- Budget : 99-299 €/mois
- Plan : **Agency**

### Persona C — Marque / grosse asso
- Veut un site multi-langue, e-commerce, blog, équipe collaborative,
  versioning, A/B test, custom domains, dashboard analytics
- Budget : 49-149 €/mois
- Plan : **Pro / Business**

### Persona D — Enterprise
- Multi-sites par marque, SSO Active Directory, SLA 99.9%, on-premise
- Budget : custom (1 000-10 000 €/mois)
- Plan : **Enterprise**

---

## 2. 🏛 Architecture multi-tenant

### Modèle hybride : "DB per tenant" + "shared platform DB"

```
┌──────────────────────────────────────────────────────────────────┐
│  PIXEESITE PLATFORM (shared)                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  PLATFORM DATABASE (postgresql://platform)                 │  │
│  │  - User, Org, Subscription, Invoice                         │  │
│  │  - Template (catalogue marketplace)                         │  │
│  │  - Domain mapping (CNAME → tenantId)                        │  │
│  │  - PlatformAuditLog                                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  TENANT 'photographe-arnaud'                                │  │
│  │  - DB: postgresql://tenant_arnaud (isolated)                │  │
│  │  - MinIO bucket: tenant-arnaud/                             │  │
│  │  - Git repo: tenants/arnaud/                                │  │
│  │  - Domain: arnaud-photo.com (CNAME → app.pixeesite.com)     │  │
│  │  - Theme: { primary: '#d946ef', font: 'Inter' }            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  TENANT 'gld' (existant — God Loves Diversity)              │  │
│  │  - DB: postgresql://tenant_gld                              │  │
│  │  - MinIO bucket: tenant-gld/                                │  │
│  │  - Domain: gld.pixeeplay.com                                │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Pourquoi DB per tenant et pas shared schema ?
| Critère              | DB per tenant ✅              | Shared schema (tenantId column) ❌ |
| -------------------- | ----------------------------- | --------------------------------- |
| Isolation données    | Forte (RGPD ✅)               | Risque de leak via bug query       |
| Backup par client    | `pg_dump tenant_arnaud` simple| Complexe (filtre tenantId)         |
| Migration schéma     | Indépendante par tenant       | Tous bloqués si migration foire    |
| Performance          | Pas de contention             | Hot tenants plombent les autres    |
| Sortie d'un client   | Donne `pg_dump` clé en main   | Export filtré (long)               |
| Coût infra           | 1 DB / tenant ($)             | 1 DB partagée (€)                  |

→ **Choix** : DB per tenant pour isolation forte (B2B/RGPD demandent ça).
   Tenant DBs sur la même instance Postgres au début (50 tenants OK),
   sharding plus tard si nécessaire.

### Auth flow
```
1. arnaud@photo.com → app.pixeesite.com/login
2. NextAuth checks PLATFORM DB (User table)
3. JWT contient { userId, orgId, role }
4. Middleware lit orgId → résout tenantId → branche prismaClient
5. Tous les API routes utilisent ce tenant client
```

### Stack technique
- **Frontend admin** : Next.js 14 App Router (single SaaS app sur app.pixeesite.com)
- **Frontend rendu sites** : Next.js per tenant (déployé en standalone par Coolify)
- **DB platform** : Postgres + Prisma
- **DB tenants** : Postgres dédiée par tenant (même instance au début)
- **Storage** : MinIO multi-bucket (1 bucket / tenant)
- **Queue** : BullMQ + Redis (jobs build, IA, emails)
- **CDN** : Cloudflare (cache pages publiques)
- **Auth** : NextAuth (admin) + JWT propre (rendu site, optionnel pour login)
- **Déploiement** : Coolify (1 stack admin + 1 stack par tenant publié)
- **Domaines custom** : Caddy/Traefik avec auto-Let's Encrypt + CNAME
- **Cron** : Coolify scheduled tasks
- **AI** : Gemini, Imagen 3, ElevenLabs, fal.ai (déjà intégrés)
- **Analytics** : Plausible self-host par tenant
- **Email** : Resend (transac) + SMTP per tenant (newsletter)

---

## 3. 🔐 Modèle de données platform DB

### Tables platform-level (partagées)

```prisma
model Org {
  id            String   @id @default(cuid())
  slug          String   @unique           // "photographe-arnaud"
  name          String
  ownerId       String                      // User qui a créé
  plan          String   @default("free")  // free | solo | pro | agency | enterprise
  planStatus    String   @default("trial") // trial | active | past_due | canceled
  trialEndsAt   DateTime?
  // Tenant DB
  tenantDbUrl   String?                    // postgres://... (chiffré)
  tenantBucket  String?                    // MinIO bucket name
  // Custom branding
  logoUrl       String?
  primaryColor  String   @default("#d946ef")
  font          String   @default("Inter")
  // Domains
  defaultDomain String?  @unique           // "arnaud.pixeesite.com"
  customDomains CustomDomain[]
  // Members
  members       OrgMember[]
  // Sites
  sites         Site[]
  invoices      Invoice[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model OrgMember {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  role      String   // owner | admin | editor | viewer
  org       Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  invitedAt DateTime @default(now())
  acceptedAt DateTime?
  @@unique([orgId, userId])
}

model Site {
  id           String   @id @default(cuid())
  orgId        String
  slug         String                      // "portfolio-mariage"
  name         String
  description  String?
  // Status
  status       String   @default("draft") // draft | published | archived
  // Deployment
  deployStatus String?                    // building | live | error
  deployedAt   DateTime?
  // Templates
  templateId   String?                    // ref Template d'origine
  // Theme override pour CE site
  theme        Json?                      // { primary, secondary, font, ... }
  // SEO
  seo          Json?                      // { title, desc, ogImage }
  // Settings
  settings     Json?                      // { faviconUrl, gtmId, ... }
  org          Org      @relation(fields: [orgId], references: [id])
  pages        SitePage[]
  domains      CustomDomain[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model SitePage {
  id        String   @id @default(cuid())
  siteId   String
  slug     String                          // "/" "/about" "/contact"
  title    String
  meta     Json?
  blocks   Json                            // array of blocks (équivaut PageBlock)
  visible  Boolean  @default(true)
  isHome   Boolean  @default(false)
  site     Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([siteId, slug])
}

model CustomDomain {
  id        String   @id @default(cuid())
  orgId     String
  siteId    String?
  domain    String   @unique               // "arnaud-photo.com"
  verified  Boolean  @default(false)
  certIssued Boolean @default(false)
  primary   Boolean  @default(false)
  // DNS verification token
  verifyToken String?
  org       Org      @relation(fields: [orgId], references: [id])
  site      Site?    @relation(fields: [siteId], references: [id])
  createdAt DateTime @default(now())
}

model Template {
  id          String   @id @default(cuid())
  slug        String   @unique             // "photo-portfolio-chic"
  name        String
  description String?
  category    String                        // photo | restaurant | sass | ecommerce
  thumbnailUrl String?
  previewUrl  String?
  blocksSeed  Json                          // structure de pages prête à seed
  free        Boolean  @default(false)
  price       Int      @default(0)         // en cents
  authorId    String?
  popularity  Int      @default(0)
  createdAt   DateTime @default(now())
}

model Subscription {
  id              String   @id @default(cuid())
  orgId           String   @unique
  stripeCustomerId String? @unique
  stripeSubId    String?  @unique
  plan            String   @default("free")
  amountCents    Int       @default(0)
  currency       String    @default("EUR")
  currentPeriodEnd DateTime?
  org             Org      @relation(fields: [orgId], references: [id])
}

model Invoice {
  id           String   @id @default(cuid())
  orgId        String
  amountCents  Int
  currency     String
  status       String                      // open | paid | void
  pdfUrl       String?
  stripeInvoiceId String? @unique
  paidAt       DateTime?
  org          Org      @relation(fields: [orgId], references: [id])
}

model PlatformAuditLog {
  id        String   @id @default(cuid())
  userId    String?
  orgId     String?
  action    String                          // "site.publish", "domain.add", ...
  metadata  Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())
}
```

### Tables par tenant DB (réplique de la struct GLD actuelle, isolée)
- `User`, `Session` (auth des END USERS du site, pas les admins)
- `PageBlock`, `Lead`, `LeadInteraction`
- `Article`, `Newsletter`, `EmailTemplate`
- `MailAccount`, `MailDraft`
- `Form`, `FormSubmission`
- `Product`, `Order`, `Cart` (e-commerce optional)
- ... toutes les tables métier

→ **Migration tool** : `pixeesite-cli tenant:migrate <orgSlug>` qui applique le schéma sur la DB tenant.

---

## 4. 🌐 Routing & rendu

### Multi-domaine / multi-tenant routing

**3 modes** :
1. **Subdomain par défaut** : `arnaud.pixeesite.com` (gratuit)
2. **Custom domain** : `arnaud-photo.com` (pointage CNAME)
3. **Path-based** (preview/dev) : `app.pixeesite.com/_preview/arnaud`

### Middleware de tenant resolution
```ts
// middleware.ts
const host = req.headers.get('host'); // arnaud-photo.com ou arnaud.pixeesite.com

let orgSlug: string | null = null;
if (host.endsWith('.pixeesite.com')) {
  orgSlug = host.split('.')[0];        // sous-domaine
} else {
  // custom domain → DB lookup
  const domain = await platformDb.customDomain.findUnique({ where: { domain: host } });
  orgSlug = domain?.org.slug;
}

if (!orgSlug) return NextResponse.rewrite(new URL('/_404-org', req.url));

// Inject l'orgSlug dans les headers pour que les pages serveur sachent qui rendre
res.headers.set('x-org-slug', orgSlug);
```

### Site Renderer
```ts
// app/[...slug]/page.tsx (sur l'app de rendu)
export default async function SiteCatchAll({ params }) {
  const orgSlug = headers().get('x-org-slug');
  const tenantPrisma = getTenantPrisma(orgSlug);

  const slugPath = '/' + (params.slug || []).join('/');
  const page = await tenantPrisma.sitePage.findFirst({
    where: { slug: slugPath, visible: true, site: { status: 'published' } }
  });
  if (!page) notFound();

  return <PageBlocksRenderer blocks={page.blocks} theme={org.theme} />;
}
```

### Modes de déploiement
**Option A — Site rendering centralisé** (plus simple à exploiter)
- 1 seule app Next.js sur `*.pixeesite.com` qui rend tous les tenants
- Plus rapide à itérer, moins de coût infra
- Limites : performance d'un tenant impacte les autres

**Option B — Site déployé en standalone par tenant**
- Au "publish", on génère un repo git + Coolify déploie une app dédiée
- Performance isolée, scaling par tenant
- Plus complexe à orchestrer

→ **Recommandation** : commencer Option A, migrer Option B pour les plans Pro+ qui le demandent.

---

## 5. 🎨 Builder visuel (extension du Page Builder GLD)

Tout ce que tu as déjà sur GLD devient le builder du SaaS, avec en plus :

### A. Marketplace de templates
- 30+ templates pré-faits par catégorie (photo, restaurant, SaaS, e-commerce, asso, podcast, etc.)
- Preview live avec switch tenant fictif
- Clone-en-1-click → seed le tenant

### B. Library de blocs étendue
**Layouts** (déjà fait) : text, image, video, hero, parallax-hero, parallax-slider,
columns, embed, spacer, cta

**Nouveaux à ajouter** :
- **Form builder** : drag-drop fields → connecté au CRM Leads
- **Pricing table** (plans avec toggle monthly/annual)
- **Testimonials carousel** avec vrais avis Google/Trustpilot via API
- **Team grid** avec photos auto-rondes et hover bio
- **FAQ accordion** avec recherche
- **Stats counter** count-up animé
- **Gallery masonry** avec lightbox
- **Map** (Leaflet) avec markers cliquables
- **Booking calendar** (Cal.com integration)
- **Newsletter signup** avec double opt-in
- **Product card** (e-commerce)
- **Code/embed** sandboxed
- **Audio/podcast player** avec timeline

### C. Theme system
```json
{
  "primary": "#d946ef",
  "secondary": "#06b6d4",
  "accent": "#f59e0b",
  "background": "#0a0a0f",
  "fontHeading": "Playfair Display",
  "fontBody": "Inter",
  "radius": "1rem",
  "spacing": "comfortable"
}
```
Chaque bloc lit ces tokens via CSS vars → changement de thème = 1 click.

### D. Responsive editor
- 3 viewports : Mobile / Tablet / Desktop
- Override par viewport : taille texte, image, hide/show

### E. Versioning & undo
- Snapshot automatique toutes les 5 minutes ou à chaque save
- Revert en 1 clic vers n'importe quel snapshot des 30 derniers jours
- Diff visuel entre versions

### F. A/B testing (plan Pro+)
- Crée un variant d'un bloc/page
- Split traffic 50/50
- Trackes les conversions auto via Plausible
- Promote le winner après 1 semaine

### G. Préfabs (composants reusables)
- L'utilisateur crée un bloc "MonHero" avec ses paramètres → le réutilise sur toutes ses pages
- Update une fois → propage partout

---

## 6. 🤖 IA features (extension de ce que GLD a déjà)

### Déjà fait sur GLD
- ✅ Page generation IA (Gemini → blocs)
- ✅ Image gen (Imagen 3 + Gemini Flash Image)
- ✅ Parallax PNG transparents
- ✅ Video prompts + fal.ai Seedance
- ✅ Newsletter content
- ✅ Article content
- ✅ Avatar HeyGen / Synthesia / D-ID

### À ajouter pour le SaaS
- **AI Brand Kit Generator** : balance ton activité → Gemini propose 5 thèmes (logo SVG, palette, fonts, ton de voix)
- **AI Copy Doctor** : audit SEO / lisibilité / RGAA accessibility de ton site, propose des fixes
- **AI Translation** : traduit toute ton site en 1 clic vers FR/EN/ES/DE/IT/PT/AR (Gemini)
- **AI Customer Support Bot** : entraîné sur le contenu du site, déployé en widget chat
- **AI Image Editor** : remove background, upscale, in-painting, swap object (Imagen Edit + DALL-E)
- **AI Video Avatar** : ton hero parle à tes visiteurs (HeyGen / Synthesia)
- **AI SEO Companion** : meta-titles, descriptions, schema.org JSON-LD, internal links
- **AI Data Analyst** : "raconte-moi mon trafic du mois" → Gemini lit Plausible et résume
- **AI Voice over** : ElevenLabs lit ton article comme un podcast embed
- **AI Form fill** : le visiteur dicte sa demande → Gemini transcrit et remplit

---

## 7. 💰 Pricing & plans

| Plan         | Prix       | Sites | Pages | Storage | Custom Domain | AI / mois | Membres | A/B Test | Code export |
| ------------ | ---------- | ----- | ----- | ------- | ------------- | --------- | ------- | -------- | ----------- |
| **Free**     | 0 €        | 1     | 5     | 100 MB  | ❌            | 50        | 1       | ❌       | ❌          |
| **Solo**     | 14 €       | 1     | ∞     | 5 GB    | ✅ 1          | 500       | 1       | ❌       | ❌          |
| **Pro**      | 39 €       | 3     | ∞     | 20 GB   | ✅ ∞          | 2 000     | 3       | ✅       | ✅          |
| **Agency**   | 99 €       | 25    | ∞     | 100 GB  | ✅ ∞          | 10 000    | 10      | ✅       | ✅          |
| **Enterprise**| custom    | ∞     | ∞     | ∞       | ✅ ∞          | ∞         | ∞       | ✅       | ✅ + SSO + SLA |

### Add-ons
- **+10 GB storage** : 5 €/mois
- **+1000 AI credits** : 9 €/mois
- **Premium templates** : 19-49 € à l'unité
- **AI Translate** : 0.01 € / mot

### Free trial : 14 jours toutes features Pro déverrouillées
### Annual : -20%
### Étudiant / asso : -50% sur preuve

---

## 8. 🔌 Intégrations (V1)

### Auth & SSO
- Google OAuth (NextAuth)
- GitHub OAuth (NextAuth)
- Email magic link (Resend)
- 2FA TOTP
- SSO Active Directory / SAML (Enterprise)

### Email & marketing
- Resend (transac)
- Brevo / Mailjet (newsletter SMTP)
- Webmail intégré (déjà fait sur GLD)

### Analytics
- Plausible (self-host par tenant)
- Google Analytics 4 (optionnel)
- Hotjar / Microsoft Clarity (heatmaps)

### Paiement
- Stripe (subscription + invoicing)
- Stripe Tax pour TVA EU auto

### Forms / CRM
- Native CRM (déjà fait sur GLD : Lead + LeadInteraction)
- Webhook vers Make / Zapier / n8n

### E-commerce
- Stripe Checkout + Stripe Payments
- Shopify (sync produits)
- Snipcart (cart léger)

### Booking
- Cal.com (embed + API)
- Calendly

### Design assets
- Unsplash API
- Pexels API
- Iconify (50k icons)
- Google Fonts

### AI
- Gemini (text + Imagen 3)
- ElevenLabs (voix)
- fal.ai (video)
- HeyGen (avatar)
- OpenAI / Anthropic (fallback)

### Social
- LinkedIn / Twitter / Instagram autopost (Buffer / Hypefury embed)

---

## 9. 🚀 Déploiement & DevOps

### Stack Coolify
- **app.pixeesite.com** : 1 service Next.js (admin SaaS)
- **render.pixeesite.com** : 1 service Next.js (rendu sites tenants centralisé)
- **postgres-platform** : DB platform
- **postgres-tenants** : DB cluster (50 tenants OK sur 1 instance moyenne)
- **redis** : cache + queue BullMQ
- **minio** : storage multi-bucket
- **plausible** : analytics
- **caddy** : reverse-proxy + auto-SSL pour custom domains

### Custom domains automation
1. Client ajoute `arnaud-photo.com` dans son admin
2. UI lui dit : "ajoute un CNAME `arnaud-photo.com → render.pixeesite.com`"
3. Cron toutes les 5 min teste le DNS via API
4. Quand DNS OK → POST API Caddy pour ajouter le domaine
5. Caddy provisionne Let's Encrypt cert auto
6. UI passe à "vérifié + HTTPS actif"

### CI/CD
- GitHub Actions :
  - Run tests sur chaque PR
  - Lint + typecheck
  - E2E Playwright sur preview
  - Auto-deploy main → Coolify webhook

### Monitoring
- Sentry (errors)
- BetterUptime (status page)
- Plausible (admin trafic)
- pgAnalyze (Postgres health)
- Logflare / Better Stack (logs)

### Backup
- pg_dump quotidien par tenant → S3 30 jours
- MinIO snapshots quotidiens
- "Export tenant" : génère un .zip avec DB dump + assets MinIO + repo git

---

## 10. 🔒 Sécurité & RGPD

### Isolation
- 1 DB par tenant (déjà argumenté)
- 1 bucket MinIO par tenant
- JWT scope les actions : un user de Org A ne peut pas requêter Org B même via API forgée
- CSP strict + `frame-ancestors` configurable par tenant

### RGPD
- Consent banner configurable par tenant
- Cookie scanner auto (compte les cookies, propose la classification)
- Privacy policy generator IA
- Export données utilisateur en 1 clic
- Right to be forgotten flow
- Sous-traitant CNIL : Anthropic / OpenAI / Google sont déclarés
- Hébergement EU (Coolify chez OVH/Scaleway/Hetzner)

### Sécurité plateforme
- 2FA obligatoire pour les owners + admin
- Audit log de toutes les actions sensibles (publish, delete site, change domain)
- IP allowlist sur l'admin (option Enterprise)
- WAF Cloudflare devant le site rendu
- Rate-limit par tenant (anti-abuse IA notamment)
- Backups chiffrés AES-256

### Modération
- Anti-spam : check spam-words sur les forms
- Liste de domaines bannis pour custom domain (phishing impersonation)
- Reports : tout utilisateur final peut signaler un site abusif
- Auto-take-down si site illégal détecté (porn enfant, fraud, etc.)

---

## 11. 📊 Admin SaaS — features pour TOI (operateur)

### Super-admin dashboard
- **Tenants** : table des 1000+ orgs avec status / plan / MRR / dernière activité
- **MRR** : graphique revenus mensuels + churn
- **Usage IA** : qui consomme combien de tokens, alertes abuses
- **Storage** : par tenant, par bucket
- **Custom domains** : list + status DNS/cert
- **Audit log** : qui a fait quoi
- **Health** : Postgres, Redis, MinIO, Coolify status
- **Support tickets** : liste + assign + status

### Tenant masquerading
- "Login as" un tenant pour debugger (avec audit log)

### Templates publishing
- Upload depuis n'importe quel tenant existant → marketplace
- Modération templates
- Royalties pour contributeurs

### Email blasts
- Notif tous les tenants : "nouvelle feature dispo"
- Newsletter produit auto

---

## 12. 📅 Plan d'implémentation — 12 phases (~4 mois autopilot)

### Phase 1 — Fondations multi-tenant (semaine 1-2)
- [ ] Schéma platform DB (Org, OrgMember, Site, SitePage, etc.)
- [ ] Tenant DB factory : `getTenantPrisma(orgSlug)` qui ouvre une connexion vers la DB du tenant
- [ ] Migration tool : `pixeesite-cli tenant:create / migrate / drop`
- [ ] Middleware tenant resolution (host → orgSlug → tenant)
- [ ] Dashboard SaaS root `/` (signup org, login)

### Phase 2 — Builder porté depuis GLD (semaine 3-4)
- [ ] Réutiliser PageBuilder, ParallaxHero/Slider, EffectsLibrary, etc.
- [ ] Migrer PageBlock → SitePage (1 page = 1 row, blocs en JSON)
- [ ] Theme system avec CSS vars
- [ ] Responsive editor (3 viewports)

### Phase 3 — Marketplace templates (semaine 5)
- [ ] CRUD templates en DB platform
- [ ] 10 templates seed (photo, restaurant, asso, agency, podcast, course, link-in-bio, real estate, blog, e-com)
- [ ] "Use template" flow → seed un nouveau site dans tenant DB
- [ ] Preview live des templates

### Phase 4 — Site rendering centralisé (semaine 6)
- [ ] App `render.pixeesite.com` qui catch-all `[...slug]` → fetch SitePage du tenant
- [ ] Subdomain support : `arnaud.pixeesite.com`
- [ ] Cache CDN Cloudflare (revalidate on publish)
- [ ] SEO : meta auto, sitemap.xml, robots.txt

### Phase 5 — Custom domains & SSL (semaine 7)
- [ ] CRUD CustomDomain + UI verification flow
- [ ] Cron DNS verification
- [ ] Caddy API integration auto-SSL
- [ ] Health check par domaine

### Phase 6 — Plans & billing Stripe (semaine 8)
- [ ] Subscription + Invoice tables
- [ ] Stripe Customer Portal embed
- [ ] Webhooks Stripe (subscription.updated, invoice.paid, etc.)
- [ ] Rate-limiter par plan (sites max, pages max, AI tokens max)

### Phase 7 — Team collab (semaine 9)
- [ ] Invitations members
- [ ] Roles & permissions
- [ ] Comments en temps réel sur les blocs (presence YJS)
- [ ] Activity feed

### Phase 8 — Forms + CRM (semaine 10)
- [ ] Form Builder block
- [ ] FormSubmission table par tenant
- [ ] Webhook auto (Make, Zapier)
- [ ] Spam protection

### Phase 9 — Analytics & A/B test (semaine 11)
- [ ] Plausible self-host par tenant
- [ ] Dashboard analytics intégré
- [ ] A/B test infra (variants + traffic split + winner)

### Phase 10 — IA suite (semaine 12-13)
- [ ] AI Brand Kit Generator
- [ ] AI Copy Doctor (SEO + a11y audit)
- [ ] AI Translation (FR ↔ 7 langues)
- [ ] AI Customer Bot widget
- [ ] AI Image Editor (remove bg, upscale)

### Phase 11 — E-commerce (semaine 14-15)
- [ ] Product / Order / Cart tables
- [ ] Stripe Checkout integration
- [ ] Inventory + variants
- [ ] Shopify sync (optionnel)

### Phase 12 — Polish & launch (semaine 16)
- [ ] Onboarding wizard
- [ ] Documentation
- [ ] Status page
- [ ] Marketing site (sur le SaaS lui-même bien sûr 😉)
- [ ] Plan launch ProductHunt + IndieHackers + LinkedIn

---

## 13. 🎯 Métriques clés de succès

### Mois 1
- 50 signups free trial
- 5 conversions Solo
- MRR 70 €

### Mois 6
- 1 000 orgs
- 200 paying (20% conv)
- MRR 8 000 €
- 3 plugins community

### Année 1
- 10 000 orgs
- 1 500 paying
- MRR 60 000 €
- 1ère agence partenaire white-label

### Année 2
- 50 000 orgs
- 7 000 paying
- MRR 300 000 €
- Levée seed 1.5 M€

---

## 14. 🛡 Risks & mitigation

| Risque                      | Mitigation                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| Webflow / Framer baisse prix| Différencier sur AI + EU + open-source + tarif € accessible      |
| Coût IA explose             | Cache agressif, quota par plan, modèles open-source en fallback  |
| 1 tenant pirate les autres  | DB isolation forte, JWT scope, audit log, WAF                    |
| Custom domain DDoS          | Cloudflare devant + rate-limit                                   |
| Concurrence locale (Hostinger Builder, Strikingly) | Focus on AI + design quality + niche LGBT/asso friendly |
| RGPD / CNIL                 | Hébergement EU + politique stricte + DPO                         |
| Lock-in concurrent          | Toujours offrir export DB + assets + git → "vous pouvez partir"  |
| Burn-out solo founder       | Recruter 1 dev frontend mois 6 + 1 sales mois 12                 |

---

## 15. 💡 Différenciateurs forts (pourquoi quelqu'un choisirait Pixeesite plutôt que Webflow ?)

1. **Prix accessible EU** — 14 € vs 23 $/mois Webflow Solo
2. **AI native pas en surcouche** — Webflow vient juste d'ajouter, encore basique
3. **100 effets parallax/wahoo** prêts dans la lib (concurrents en ont 5-10)
4. **Self-hostable / export complet** — anti lock-in
5. **Hébergement EU + RGPD** — clients EU galèrent avec providers US
6. **Community-friendly** — assos, indé, créateurs, niches LGBT/spi/écolo
7. **Plugin architecture** — tu peux ajouter ton bloc custom comme on ajoute un MCP
8. **Open core** — code de base sur GitHub, plugins premium fermés
9. **Tarif annuel généreux** + crédits IA généreux
10. **Studio collaboratif live** (presence YJS) — Framer l'a, Webflow non

---

## 16. 🔧 Fichiers de départ à créer

```
apps/
  admin/                       # Next.js admin SaaS (app.pixeesite.com)
    src/app/(auth)/login/...
    src/app/(dashboard)/orgs/[slug]/...
    src/app/api/...
    prisma/schema.platform.prisma

  render/                      # Next.js rendu sites (render.pixeesite.com)
    src/app/[...slug]/page.tsx
    middleware.ts (host → orgSlug)
    src/lib/tenant-prisma.ts

  cli/                         # CLI ops
    bin/pixeesite-cli.ts
    src/commands/tenant-create.ts
    src/commands/tenant-migrate.ts

packages/
  blocks/                      # Library partagée des blocs
    src/ParallaxHero.tsx
    src/ParallaxSlider.tsx
    src/EffectsLibrary.ts
    ...

  ui/                          # Design system
    src/Button.tsx
    src/Modal.tsx
    ...

  ai/                          # Wrappers IA
    src/gemini.ts
    src/imagen.ts
    src/elevenlabs.ts
    src/falai.ts

  database/                    # Prisma schemas
    platform.prisma
    tenant.prisma
    src/getTenantPrisma.ts

infrastructure/
  coolify/                     # docker-compose.yml + Caddyfile
  github-actions/
```

→ **Monorepo** avec **pnpm workspaces** + **Turborepo** pour build incrémental.

---

## 17. 🎬 Premier livrable — MVP en 4 semaines

Si tu veux commencer demain, **MVP minimum** :
1. Fork du repo GLD actuel
2. Renomme `[locale]` en `[orgSlug]` ou ajoute préfixe `/_t/[orgSlug]`
3. Multi-tenancy via colonne `orgId` (shared schema, simpler) sur PageBlock + Lead
4. Signup / login org sur `/signup`
5. Dashboard `/dashboard` qui liste les sites de l'org
6. Page builder existant fonctionne sans modifs
7. Subdomain wildcard via Caddy + middleware
8. Stripe Checkout pour 2 plans (Free + Pro)
9. Beta privée → 5 friendly users → feedback → itération

Migration vers DB-per-tenant en mois 3 quand tu as la traction pour justifier la complexité.

---

## 18. 🚦 Décisions immédiates à prendre

1. **Nom** : Pixeesite ? Builderly ? Pageforge ? GLDsite ? → branding
2. **Domain** : pixeesite.com ? .app ? .io ? → acheter
3. **Stack**: monorepo dès le début ou Mono-app puis split ?
   → Recommandation : mono-app au début, split en monorepo au mois 3
4. **DB strategy V1** : shared schema (`orgId` column) ou DB-per-tenant ?
   → Recommandation : shared schema pour MVP rapide, migration vers DB-per-tenant Phase 1
5. **Open source ?** : MIT / AGPL / BUSL ?
   → Recommandation : core MIT, plugins premium fermés (BUSL converti MIT après 4 ans)
6. **Branding et tone of voice** : warm-friendly comme GLD ? techie comme Vercel ? quirky comme Linear ?
7. **Premier vertical** : photographes ? assos ? créateurs ? agences ?
   → Recommandation : *photographes* (déjà ton réseau, vertical chaud, peu de comp)

---

## 19. 📞 Action plan immédiat

**Semaine 1** :
- [ ] Acheter domaine + email pro
- [ ] Setup monorepo Next.js + Prisma + Tailwind
- [ ] Schema platform DB v1
- [ ] Login / signup org

**Semaine 2** :
- [ ] Port du PageBuilder GLD
- [ ] Subdomain wildcard
- [ ] Premier site test

**Semaine 3** :
- [ ] Stripe integration
- [ ] 3 templates seed
- [ ] Beta closed avec 5 amis photographes

**Semaine 4** :
- [ ] Custom domain support (Caddy + Let's Encrypt)
- [ ] Status page
- [ ] Launch IndieHackers + LinkedIn

---

## 20. ⚖️ Aspects légaux

- **Forme** : SAS / SARL en France ; ou Stripe Atlas USA si tu veux US-friendly
- **CGU/CGV** : génère via Termly ou Iubenda + relecture avocat
- **DPA** (Data Processing Agreement) requis pour B2B ; template à tenir prêt
- **Mentions légales** auto sur chaque site rendu (footer)
- **TVA EU** : Stripe Tax gère
- **Marques** : déposer "Pixeesite" à l'INPI (~250 €) + EUIPO (~850 €)
- **Conditions d'utilisation IA** : clarifier ownership des contenus générés (l'utilisateur les possède, mais le service fournit l'IA)

---

## 🎯 TL;DR — Si tu veux juste commencer

> Forke GLD, ajoute une colonne `orgId` à toutes les tables métier, mets
> un middleware qui résout le subdomain → orgId, fais signup / login org
> sur le SaaS, et tu as déjà 80% d'un Webflow-killer. Le reste (custom
> domains, billing, marketplace) c'est de l'enrichissement linéaire.

**Time to first revenue avec ce MVP** : ~3-4 semaines en autopilot full-stack.

---

*Dernière update : 2026-05-10 — généré pour Arnaud Gredai.*
