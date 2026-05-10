# 🎯 Plan — Agent scraper contacts ultra-puissant pour GLD

> Système d'extraction et d'enrichissement automatique de contacts (email, téléphone, WhatsApp, social handles) depuis n'importe quelle source web, alimenté par un agent IA qui formule lui-même les requêtes de recherche.

---

## 1. Vision en une phrase

Tu lui dis : *« Trouve-moi 200 pasteurs LGBT-friendly francophones avec leur email et WhatsApp »* — il revient 30 minutes plus tard avec une liste propre, déduplicquée, validée, dans `/admin/leads`, prête à recevoir une newsletter.

---

## 2. Architecture en 5 couches

```
┌────────────────────────────────────────────────────────────────┐
│  COUCHE 5 — UI Admin (/admin/leads + /admin/leads/scraper)     │
│  Wizard "Trouve-moi X contacts type Y" + suivi progression     │
├────────────────────────────────────────────────────────────────┤
│  COUCHE 4 — Agent IA orchestrateur (Gemini grounded search)    │
│  Décompose la demande → liste d'URLs cibles → dispatch workers │
├────────────────────────────────────────────────────────────────┤
│  COUCHE 3 — Workers d'extraction (BullMQ — déjà installé)      │
│  Queue de jobs parallèles, retry, throttle, priorité           │
├────────────────────────────────────────────────────────────────┤
│  COUCHE 2 — Adapters par source (web / LinkedIn / Insta / …)   │
│  Chaque adapter sait extraire depuis son type de page          │
├────────────────────────────────────────────────────────────────┤
│  COUCHE 1 — Detectors (regex + libs) + Validators              │
│  Email · phone international · WhatsApp · handles sociaux      │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Modèles Prisma à créer / étendre

```prisma
// Étendre le LeadScrapeJob existant
model LeadScrapeJob {
  id              String     @id @default(cuid())
  name            String
  goal            String     @db.Text     // "200 pasteurs LGBT FR avec email + WA"
  source          String     // web | linkedin | instagram | google-maps | annuaire | ai-driven
  config          Json       // keywords, location, depth, filters
  status          String     @default("pending") // pending | running | paused | done | failed
  // Progression
  totalUrls       Int        @default(0)
  processedUrls   Int        @default(0)
  contactsFound   Int        @default(0)
  contactsValid   Int        @default(0)
  // Coûts
  estimatedCostEur Float?
  actualCostCents Int?
  // Schedule
  active          Boolean    @default(true)
  schedule        String?    // cron expression "0 9 * * 1" pour weekly
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  // Output
  resultsLeadIds  String[]   @default([])
  errors          String[]   @default([])
  // Audit
  createdById     String?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  jobs            ScrapeWorkerJob[]
}

// Sub-job par URL à scraper
model ScrapeWorkerJob {
  id            String   @id @default(cuid())
  parentJobId   String
  parent        LeadScrapeJob @relation(fields: [parentJobId], references: [id], onDelete: Cascade)
  url           String
  source        String
  status        String   @default("pending") // pending | running | success | failed | skipped
  attempts      Int      @default(0)
  contactsFound Int      @default(0)
  rawHtml       String?  @db.Text  // sample pour debug, optional
  extractedData Json?
  errorMessage  String?
  startedAt     DateTime?
  finishedAt    DateTime?
  createdAt     DateTime @default(now())

  @@index([parentJobId, status])
  @@index([url])
}

// Lead existe déjà — étendre avec :
//   - waNumber String?           // WhatsApp normalisé E.164
//   - emailValidated Boolean     // MX check OK
//   - emailValidatedAt DateTime?
//   - phoneCountry String?       // FR, US, etc.
//   - phoneType String?          // mobile, fixed, voip
//   - linkedinHandle String?
//   - instagramHandle String?
//   - twitterHandle String?
//   - duplicateOf String?        // soft-merge des doublons
```

---

## 4. Detectors (Couche 1) — extraire des contacts depuis HTML/texte

### 4.1 Email
```ts
// Regex robuste + filtre anti-faux-positifs
const RE = /([a-z0-9._%+-]+)@([a-z0-9.-]+\.[a-z]{2,})/gi;
// Skip : noreply, donotreply, postmaster, info@example.com
// Skip : domaines suspects (sentry, mixpanel, gravatar)
// Bonus : décode obfuscation @, [at], (at), email-protected Cloudflare
```

### 4.2 Téléphones internationaux
- Lib : **`libphonenumber-js`** (Google, format E.164)
- Détecte tous formats : `+33 6 12 34 56 78`, `06.12.34.56.78`, `(212) 555-0100`
- Normalise en E.164 : `+33612345678`
- Classifie : mobile / fixed / voip
- Lookup carrier optionnel (paid API)

### 4.3 WhatsApp
- Liens : `wa.me/33612345678`, `api.whatsapp.com/send?phone=...`, `whatsapp://send?phone=...`
- Boutons CTA (Click to Chat) sur sites pros
- Bio Instagram avec icône WA + numéro

### 4.4 Handles sociaux
- LinkedIn : `linkedin.com/in/<handle>`, `/company/<slug>`
- Instagram : `instagram.com/<handle>` ou `@<handle>` dans le texte
- Twitter/X : `twitter.com/<handle>`, `x.com/<handle>`, `@<handle>`
- Facebook : `facebook.com/<page>` ou `fb.com/<page>`

### 4.5 Anti-obfuscation
- Cloudflare email protection : décodage hex inline
- HTML entities `&commat;` → `@`
- JS obfuscation : `'name' + '@' + 'domain.com'` → eval safe avec sandbox

---

## 5. Adapters par source (Couche 2)

| Source | Stratégie | Risque légal | Throttle |
|---|---|---|---|
| **Site web public** | Crawl polite-fetch + Jina Reader fallback (déjà en place dans GLD) | Faible — ToS varient | 800ms/host |
| **Sitemap XML** | Parse `/sitemap.xml`, prioritise `/contact`, `/about`, `/team` | Faible | 800ms/host |
| **LinkedIn (public)** | Profils ouverts uniquement, pas de scraping post login | ⚠️ ToS strict — limiter à 100/jour | 5s/req + UA mobile |
| **Instagram (public)** | Bios publiques, hashtags avec Apify ou Bright Data | ⚠️ ToS — préférer API officielle | 3s/req |
| **Twitter/X (public)** | Profils + bios via Nitter ou X API v2 (limité) | Acceptable | 2s/req |
| **Google Maps** | Places API (officielle, payante) ou scraping prudent | OK avec API | 1s/req |
| **Pages Jaunes / Yelp** | Scraping pages publiques | OK | 2s/req |
| **GitHub** | API officielle pour orgs/users + emails publics | Acceptable | 5000/h |
| **YouTube** | API v3 — descriptions, "à propos" channels | OK | 10000/jour |
| **Annuaires verticaux** | Sites pros (officiants, avocats, profs) | OK généralement | 1s/req |

**Note** : pour les sources risquées (LinkedIn / Insta), l'app **doit** :
1. Mettre un disclaimer explicit dans l'admin
2. Limiter les volumes par jour
3. Préférer les **API officielles** (Apollo, Hunter.io, Phantombuster) pour ces 2 plateformes

---

## 6. Pipeline d'extraction (Couche 3)

```
┌─────────────┐
│  USER       │  "Trouve 200 contacts de pasteurs LGBT FR"
└──────┬──────┘
       ▼
┌─────────────────────────────────────────────────────┐
│ 1. AGENT IA — décompose en plan d'action            │
│    Gemini grounded search :                         │
│    "Liste 30 sites/annuaires/pages avec ces       │
│     contacts. Retourne JSON {urls: [...]}"         │
└──────┬──────────────────────────────────────────────┘
       ▼ 30 URLs
┌─────────────────────────────────────────────────────┐
│ 2. CRÉATION JOBS — un ScrapeWorkerJob par URL       │
│    Status pending, queue BullMQ                     │
└──────┬──────────────────────────────────────────────┘
       ▼ N workers parallèles (concurrency 3)
┌─────────────────────────────────────────────────────┐
│ 3. WORKER — pour chaque URL :                       │
│    a. polite-fetch HTML                             │
│    b. extract emails/phones/handles                 │
│    c. follow links pertinents (contact, team)       │
│    d. up to depth=2                                 │
│    e. enrichment IA si nom + entreprise détectés    │
│       → "Quel est le rôle de X chez Y ?" via Gemini │
└──────┬──────────────────────────────────────────────┘
       ▼ Contacts bruts
┌─────────────────────────────────────────────────────┐
│ 4. VALIDATION                                       │
│    - Email : MX record check (DNS)                  │
│    - Phone : libphonenumber valid + format E.164    │
│    - WhatsApp : on présume valide si format OK      │
│    - Dédupe : email canonical, phone E.164          │
└──────┬──────────────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────────────────┐
│ 5. UPSERT dans Lead (existing model)                │
│    - merge avec lead existant si email match       │
│    - tag automatique selon source/keyword           │
│    - sourceDetail = URL d'origine (audit)           │
│    - status = "new" (à toi de qualifier ensuite)    │
└──────┬──────────────────────────────────────────────┘
       ▼
┌─────────────────────────────────────────────────────┐
│ 6. NOTIFY — Telegram quand job done                 │
│    "✅ 187/200 contacts trouvés en 24min"           │
│    + lien direct vers /admin/leads filtré           │
└─────────────────────────────────────────────────────┘
```

---

## 7. Agent IA autonome (Couche 4)

### Comment Gemini formule les requêtes :

```ts
// User goal: "200 pasteurs LGBT FR avec email + WA"

// 1. Décomposition (Gemini)
const plan = await gemini.generate({
  prompt: `Tu es un agent de prospection. Goal: ${userGoal}.
    Liste 30 URLs sources où trouver ces contacts en respectant la légalité.
    Privilégie : annuaires pros, sites d'asso, pages "équipe", églises inclusives.
    Évite : profils LinkedIn personnels, Insta privés, scraping massif.

    Réponds JSON : { urls: [{url, expectedFinds: 5, notes: "..."}] }`,
  tools: ['google_search']  // grounding
});

// 2. Pour chaque URL, on lance un worker
// 3. Si après 50 URLs on a < 50% du goal, l'agent relance Gemini :
//    "Plan initial épuisé, suggère 30 nouvelles sources complémentaires"
```

### Self-corrige : si beaucoup d'erreurs, change de stratégie

```
Si > 50% des URLs échouent → bascule sur Jina Reader (déjà là)
Si < 5% de contacts trouvés/page → revisite plan avec Gemini
Si rate-limit → backoff exponentiel + change UA
```

---

## 8. Validation des contacts (Couche 1.5)

### Email — MX record check
```ts
import { resolveMx } from 'dns/promises';
async function emailExists(email: string) {
  const domain = email.split('@')[1];
  try {
    const records = await resolveMx(domain);
    return records.length > 0;
  } catch { return false; }
}
```

### Email — Catch-all detection (avancé)
- Test envoi vers `random123@<domain>` — si accepté = catch-all (faux positif possible)
- Indique dans la card un badge "⚠ catch-all"

### Phone — libphonenumber
```ts
import { parsePhoneNumber } from 'libphonenumber-js';
const p = parsePhoneNumber(input, 'FR');
if (p?.isValid()) {
  return {
    e164: p.format('E.164'),
    country: p.country,
    type: p.getType()  // mobile/fixed-line/voip
  };
}
```

### Email — Bonus enrichissement (Hunter.io / Apollo)
- Si user a `HUNTER_API_KEY` configuré → vérifie quality score, déliverabilité
- Si user a `APOLLO_API_KEY` → enrichit avec poste, entreprise, LinkedIn

---

## 9. UI Admin (Couche 5)

### `/admin/leads/scraper` — Dashboard agent
- Liste des `LeadScrapeJob` avec status, progression %, coût
- Bouton **« 🚀 Nouveau scraping »** → wizard 4 étapes :
  1. **Goal** : input texte libre + nombre cible
  2. **Sources** : checkboxes (web / LinkedIn / Insta / Maps / annuaires)
  3. **Filters** : pays, langue, mots-clés, exclusions
  4. **Plan IA** : Gemini propose les URLs → tu approuves/édites avant launch
- **Live** : progression temps réel (polling 3s) avec :
  - Sparkline contacts/min
  - URL en cours
  - Compteur contacts trouvés / validés / dupliqués
- **Telegram** : push notif quand done + résumé

### `/admin/leads` (existant) — section scraper
- Filtre par `LeadScrapeJob` source : "tous les leads issus du scrape X"
- Bouton "Send WhatsApp" si numéro WA valide → ouvre wa.me link
- Export CSV des leads d'un job

---

## 10. RGPD & risques légaux

### À respecter (non négociable)
- ✅ **Source documentée** : chaque lead a `source` + `sourceDetail` (URL d'origine)
- ✅ **Droit à l'oubli** : DELETE supprime aussi audit + interactions
- ✅ **Pas d'opt-in présumé** : `newsletterOptIn = false` par défaut sur scrape
- ✅ **Email transactionnel uniquement** au début (ex: invitation manuelle, pas mass mailing)
- ✅ **Disclaimer prospection B2B** : si le user a `companyName` détecté → tu peux les contacter en B2B (cadre LCEN moins strict que B2C)

### Risque par source
- **LinkedIn / Insta** : ToS interdisent le scraping non-autorisé. Risque ban + procès.
  → Recommandation : utiliser **Apollo / Phantombuster** (services qui assument le risque) au lieu de scraper soi-même.
- **Google Maps** : ToS interdisent scraping. → utiliser **Places API officielle**.
- **Sites publics** : OK si robots.txt l'autorise (déjà géré par notre polite-fetch).

### À ajouter dans GLD
- Page **`/admin/leads/rgpd`** : export complet des données d'un user (request RGPD), historique des interactions
- Cron : tous les leads `scraped` non contactés depuis 6 mois → archive automatique

---

## 11. Coûts estimés

| Volume | Coût mensuel |
|---|---|
| **Sites publics (notre scraper)** | Gratuit (que CPU Coolify) |
| **Jina Reader (fallback)** | Gratuit jusqu'à 20 req/min, ensuite ~$1/1000 req |
| **Gemini agent (planning)** | ~$0.15 par batch de 200 contacts (Flash) |
| **MX validation** | Gratuit (DNS local) |
| **libphonenumber** | Gratuit (lib) |
| **Apollo API** (optionnel) | $49/mois — 1200 enrichissements/mois |
| **Hunter.io** (optionnel) | $49/mois — 500 emails vérifiés/mois |
| **Google Places API** | $17/1000 requêtes (mais $200 free/mois) |
| **Phantombuster** | $59/mois — 1h auto/jour pour LinkedIn |

**Setup GLD pur (gratuit + Gemini seul)** : ~$5-15/mois pour 1000 contacts/mois.
**Setup pro (avec Apollo + Hunter)** : ~$100/mois pour 5000 contacts/mois validés.

---

## 12. Phases d'implémentation (8 commits)

### **Phase 1 — Detectors + Validators** (1 commit)
- `lib/contact-detectors.ts` : extractEmails, extractPhones, extractHandles, extractWhatsApp
- `lib/contact-validators.ts` : MX check, libphonenumber wrapper
- Tests unitaires sur 20 pages d'exemple
- Lib npm : `libphonenumber-js`

### **Phase 2 — Adapter web générique** (1 commit)
- `lib/scrape-adapters/web.ts` : crawl polite-fetch + extract + follow internal links depth=2
- Réutilise polite-fetch + Jina Reader (déjà là)
- Ajout sitemap parsing pour découvrir `/contact`, `/about`, `/team`

### **Phase 3 — Workers BullMQ** (1 commit)
- `workers/scrape-contacts.ts` : worker BullMQ (déjà installé)
- Queue par job, concurrency 3, retry 2x
- Update progressif `ScrapeWorkerJob`

### **Phase 4 — Agent IA orchestrateur** (1 commit)
- `lib/scrape-agent.ts` : prend goal user → Gemini grounded search → liste URLs
- Self-correct si trop d'échecs

### **Phase 5 — UI Admin scraper** (1 commit)
- `/admin/leads/scraper` : liste jobs + wizard 4 étapes
- Live polling progression
- Plan IA editable avant launch

### **Phase 6 — Adapters spécialisés** (1 commit)
- `lib/scrape-adapters/google-maps.ts` (Places API)
- `lib/scrape-adapters/sitemap.ts`
- `lib/scrape-adapters/github.ts` (orgs publics)

### **Phase 7 — Telegram notif + cron schedule** (1 commit)
- Notif fin de job → Telegram avec résumé
- Cron `/api/cron/scrape-jobs` : reprend les jobs `active` selon schedule

### **Phase 8 — Polish + RGPD page** (1 commit)
- `/admin/leads/rgpd/[id]` : export complet user
- Auto-archive 6 mois
- Doc inline avec disclaimers légaux

---

## 13. Estimation totale

| Phase | Lignes de code | Temps Claude (autopilot) |
|---|---|---|
| 1 — Detectors | ~400 | 15 min |
| 2 — Adapter web | ~300 | 10 min |
| 3 — Workers BullMQ | ~250 | 10 min |
| 4 — Agent IA | ~200 | 8 min |
| 5 — UI scraper | ~600 | 20 min |
| 6 — Adapters spé | ~400 | 15 min |
| 7 — Telegram + cron | ~200 | 8 min |
| 8 — RGPD + polish | ~250 | 10 min |
| **TOTAL** | **~2600 LOC** | **~1h40 en autopilot** |

---

## 14. Démarrage rapide V1 (1 phase, ~30 min)

Si tu veux **juste un MVP** qui marche tout de suite :
1. Phase 1 (detectors)
2. Phase 2 (adapter web)
3. UI minimaliste : input URL + bouton "Extraire" → liste contacts → import bouton

Ça donne un outil utilisable où tu colles une URL et il te sort emails/téls. Le reste vient ensuite.

---

## 15. Questions pour toi avant de démarrer

1. **Volume cible mensuel** ? (100 / 1000 / 10000 contacts)
2. **Sources prioritaires** ? (web pur / LinkedIn payant via Apollo / Google Maps / annuaires verticaux)
3. **Budget API** ? (gratuit only / 50€/mois / 200€/mois)
4. **Légalité** : tu cibles **B2B uniquement** (cadre légal souple) ou aussi B2C (consentement requis) ?
5. **Goal type** : prospection com / recrutement / influence / journalistique ?

Réponds à ces 5 questions et je lance l'implémentation par phases avec autopilot Telegram pour validation à chaque jalon.

---

## 🎯 TL;DR

**Tu décris une cible** → **Gemini propose un plan** → **tu valides** → **30 workers parallèles scrappent** → **validation MX + libphonenumber** → **upsert dans Lead avec audit RGPD** → **notif Telegram quand done** → **liste prête dans /admin/leads**.

Stack 100% maison, gratuit (sauf Gemini ~$0.15/batch), opt-in API tierces si besoin de plus de précision.
