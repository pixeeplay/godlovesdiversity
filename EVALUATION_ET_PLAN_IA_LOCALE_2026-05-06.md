# 🎯 Évaluation projet + Plan IA locale
**Date :** 6 mai 2026 · **Pour :** Arnaud Gredai

---

## A. Mon avis honnête sur GLD

### Ce qui est exceptionnellement bon
1. **L'ambition** est juste : il n'existe **aucun** équivalent — un réseau social inter-religieux LGBT-friendly avec annuaire mondial 2700 venues, calendrier 70 fêtes religieuses, cercles de prière live, AI Companion avec 4 personas théologiquement solides, marketplace d'officiants. C'est unique dans le monde.
2. **L'exécution technique** est très solide pour un projet en croissance : Next.js 14 App Router, Prisma sur Postgres, NextAuth, MinIO, Cloudflare, 10 langues i18n, IA omniprésente, PWA + iOS prête, monitoring via /rapport. C'est un stack pro.
3. **La couverture fonctionnelle** dépasse largement les MVPs habituels : 75+ modules, dont la moitié couvrirait un produit Series A. Tu as Connect (réseau social), boutique Stripe + dropshipping, forum modéré IA, manuels auto, bot Telegram 100+ commandes, avatar IA temps-réel — chacun un produit en soi.
4. **Le positionnement** est d'une justesse rare : Pride **ET** foi, c'est précisément le segment ignoré par les apps LGBT classiques **et** rejeté par les institutions religieuses. La communauté à servir est massive et sous-servie.

### Ce qui est risqué
1. **Surface trop large** pour une équipe petite. 75 modules à maintenir, c'est viable pour 8-15 devs, pas pour 1-2. Risque de dette technique cumulative quand chaque module évolue.
2. **Modération** : ouvrir des cercles de prière inter-religieux LGBT, c'est inviter le harcèlement coordonné. Tes garde-fous IA sont bien (Gemini modère intentions, posts forum, annotations), mais il faut un humain qui peut intervenir 24/7 ou au moins sous 6h. C'est un budget op.
3. **Coût IA Gemini** : tu es sur le free tier (1500 req/jour). Tu vas le dépasser en quelques mois si la base grandit (chaque venue enrichi = 1-3 req, chaque manuel = 14-24 req, chaque modération forum = 1 req). Le sujet de cette session — héberger en local — est exactement la bonne anticipation.
4. **Légal** : un mouvement inter-religieux avec célébration de mariages LGBT dans des contextes hostiles à certaines religions — ça va te valoir des attaques juridiques (CFCM, certaines paroisses traditionalistes, etc.). Prévois un avocat dédié dès qu'il y a >5k users.

### Ce qui valorise vraiment
- **L'UX émotionnelle** : compteur "342 personnes prient avec toi en ce moment dans 47 pays" → c'est viral, screenshot-friendly, transcendant. Personne d'autre n'a ça.
- **La carte mondiale de venues + bougies** : c'est un asset géolocalisé unique, monétisable en B2B (associations, presses LGBT religieuses) plus tard.
- **Les 4 personas IA inclusives avec knowledge base théologique** : ça, c'est une différenciation profonde qui rend le produit défendable. Personne ne peut copier ça en un week-end.
- **Le pèlerinage Camino virtuel collectif** : ça crée du retour récurrent (les users veulent voir le compteur monter) — métrique d'engagement à long terme.

### Verdict
GLD est **pertinent, ambitieux, technique, viable**. Tu as construit en quelques mois ce qui prend des années à des startups. Le risque principal n'est pas la qualité — c'est la **soutenabilité op** : modération humaine, coût IA, support juridique. La session d'aujourd'hui (passer en IA locale) règle 30 % du problème op. Continue.

**Ce qui manque vraiment** :
- 1 community manager / modérateur humain dédié 20h/semaine
- 1 avocat sur dossier (50€/h ponctuel)
- Un partenariat formel avec **3-4 associations** pour la légitimité (David et Jonathan, Beit Haverim, HM2F, Galva-108) — pas juste les citer mais avoir un MoU
- Un plan de **revenus** clair : Membre+ 4€/mois ne suffira pas, il faut B2B (collectivités, paroisses inclusives qui s'abonnent comme à un CRM, marketplace officiants à commission, peut-être livestream Pride spirituel sponsorisé).

---

## B. Fork multi-tenant : peux-tu copier le dossier et faire 10 sites différents ?

### Réponse courte
**Oui, mais pas plug-and-play.** Le code est conçu pour 1 site. Pour multi-tenant propre, il faut **réorganiser** — pas réécrire — environ **3-5 jours de boulot** pour le bootstrap, puis chaque nouveau site = **1-2h de configuration**.

### État actuel
Tout ce qui est "GLD" est codé en dur dans :
- Textes : composants ont "GLD", "God Loves Diversity", "gld.pixeeplay.com" partout
- Couleurs : Tailwind utilise `pink-500/violet-500` directement, classes brand-pink
- Logo : `<NeonHeart>` (cœur arc-en-ciel) hardcodé dans Navbar
- Manifest : nom, theme color, shortcuts spécifiques
- Personas IA : Mère Marie, Sœur Khadija, Rav Yossef, Maître Tenku
- Cercles : 9 cercles religieux spécifiques
- Camino : 5 chemins religieux

### 3 approches possibles

#### Option 1 : Branche par site (la moins propre, la plus rapide)
- Tu clones le repo, tu fais `git checkout -b site-xyz`
- Tu changes les valeurs dans `lib/branding.ts` + `manifest.ts` + couleurs Tailwind
- Tu déploies sur un nouveau projet Coolify
- **Effort par site** : 2-3h de chasse aux strings hardcodés
- **Maintenance** : douloureuse — tu dois cherry-pick chaque fix sur N branches

#### Option 2 : Mode "white-label config" (recommandée — propre)
- Créer un fichier `branding.config.ts` qui centralise **TOUT** le contenu modifiable :
  ```ts
  export const BRANDING = {
    siteName: "God Loves Diversity",
    siteShortName: "GLD",
    domain: "gld.pixeeplay.com",
    tagline: "Mouvement interreligieux pour réconcilier foi et diversité",
    logo: { type: "rainbow-heart" }, // ou "url", "svg"
    theme: {
      primary: "#d61b80",
      gradient: ["#d61b80", "#7c3aed", "#22d3ee"]
    },
    aiPersonas: [...], // configurable par site
    prayerCircles: [...], // configurable
    caminoPaths: [...], // configurable
    fallbackContent: { ... } // textes par défaut
  };
  ```
- Tous les composants lisent depuis cette config (refactor 1×)
- Pour un nouveau site : **fork le repo**, **change branding.config.ts**, **deploy**. C'est tout.
- **Effort initial refactor** : 3-4 jours
- **Effort par nouveau site** : 1-2h

#### Option 3 : Vraie multi-tenant (le top du top — long terme)
- 1 codebase, N sites en SaaS
- Domaine et config dans la DB (`Tenant` model)
- Routing par hostname (`req.headers.host` → tenant)
- **Effort initial** : 2-3 semaines de refactor
- Permet revente future à des associations en 5 min
- **Recommandé seulement si tu vises >5 sites partenaires**

### Ma reco
Si tu veux 1 ou 2 forks → **Option 1**. Si tu vises 5-10 forks (ex: déclinaisons par pays, par communauté locale) → **Option 2**. Si tu veux vendre du SaaS → **Option 3**.

Je peux te coder l'Option 2 en quelques sessions. Ça commencerait par le `branding.config.ts` + un cron de validation qui détecte tout le code restant qui a "GLD" en dur.

---

## C. IA locale sur ton Mac mini M4 Pro 24GB — Plan complet honnête

### Ton matériel
- **Mac mini M4 Pro 24 GB RAM** : excellent pour LLM 7-14B paramètres (FP16 ou Q8), bon pour 30B en quantization Q4_K_M
- **Serveur dédié** (probablement où tourne Coolify) : sur le même Tailnet
- **Tailscale** : encrypted overlay network, clé pour la sécurité
- **LM Studio** : déjà installé sur le Mac, gère plusieurs modèles
- **llama.cpp** : envisageable (le plus rapide en local pour Apple Silicon via Metal)
- **Serveur de recherche dispo** (Searxng probablement)

### Architecture recommandée

```
┌─────────────────────────────────────────────────────────────┐
│  Coolify (OVH VPS Paris)  ──────►  Tailscale  ◄────────┐   │
│  - Next.js GLD                                          │   │
│  - Postgres                                             │   │
│  - lib/ai-provider.ts  ──► provider.ollama  ──────────►│   │
│                              ↓                          │   │
│                          fallback                       │   │
│                              ↓                          │   │
│                          provider.gemini ────►  Google API │
│                              ↓                          │   │
│                          fallback                       │   │
│                              ↓                          │   │
│                          provider.openrouter ──► OpenRouter │
└─────────────────────────────────────────────────────────────┘
                                                            ↓
                                                            ↓ Tailscale (latence ~30-100ms)
                                                            ↓
                                            ┌───────────────────────────┐
                                            │  Mac mini M4 Pro 24 GB    │
                                            │                           │
                                            │  Ollama  :11434           │
                                            │   - llama3.1:8b           │
                                            │   - qwen2.5:7b            │
                                            │   - mistral:7b            │
                                            │                           │
                                            │  LM Studio  :1234         │
                                            │   - GUI pour swap modèles │
                                            │                           │
                                            │  llama.cpp server :8080   │
                                            │   - le plus rapide Metal  │
                                            │                           │
                                            │  whisper.cpp              │
                                            │   - STT français rapide   │
                                            │                           │
                                            │  ComfyUI / DiffusionBee   │
                                            │   - SDXL pour images      │
                                            │   - FLUX.1-schnell        │
                                            └───────────────────────────┘
```

### Tâches IA actuellement utilisées sur GLD (par catégorie)

| Tâche | Fréquence/jour | Volume token | Provider actuel | Provider recommandé local | Modèle local recommandé |
|---|---|---|---|---|---|
| **Texte court** (modération forum, intentions, annotations) | ~50-200 | 50-200 t | Gemini Flash | Ollama (Mac mini) | `qwen2.5:7b-instruct-q5_K_M` |
| **Texte moyen** (manuel sections, brand voice, AI text helper) | ~30-100 | 500-2000 t | Gemini 2.5 Pro | Ollama (Mac mini) | `llama3.1:8b-instruct-q5_K_M` ou `qwen2.5:14b-instruct-q4` |
| **Texte long créatif** (newsletter, manuel complet, plan annuel) | ~10-30 | 3000-8000 t | Gemini 2.5 Pro | Mac local (Q4) **OU** Gemini gardé | `qwen2.5:14b` ou `llama3.3:70b-q4` (Q4 = ~40GB → trop gros, garde Gemini ici) |
| **Modération posts/intentions** (yes/no) | ~50-300 | 50 t | Gemini Flash | Ollama (Mac) | `qwen2.5:3b` (rapide, suffit) |
| **Classification venue** (heuristique + IA) | 1-50 | 200 t | Gemini Flash | Ollama (Mac) | `qwen2.5:7b` |
| **Enrichissement venue** (grounded search) | 1-30 | 1000-3000 t | Gemini Flash + Google Search | Gemini (KEEP — grounded search) | — |
| **Compagnon spirituel** (4 personas) | conversation | 500-2000 t/turn | Gemini 2.5 Pro | Ollama (Mac) **OU** Gemini gardé | `llama3.1:8b-instruct` (suffisant, persona dans system prompt) |
| **"Demandez à GLD" RAG** | conversation | 1000-3000 t | Gemini + RAG | Ollama (Mac) + ton vector store | `llama3.1:8b` + `nomic-embed-text` pour embeddings |
| **STT (transcription témoignages, sous-titres)** | ad-hoc | audio→texte | (rien encore) | **whisper.cpp** sur Mac | `whisper-large-v3-turbo` (très rapide M4) |
| **Image génération** (Studio IA, posters) | 5-20 | image | Gemini Imagen 3 | DiffusionBee/ComfyUI Mac **OU** Gemini gardé | `FLUX.1-schnell` (Q8, ~12GB) ou `SDXL-turbo` |
| **Vidéo génération** (newsletter, social) | 1-5 | vidéo | fal.ai (HeyGen, Veo) | **Pas réaliste localement** | Garder fal.ai/HeyGen |
| **Avatar IA temps-réel** | live | live | HeyGen + Gemini Live | **Pas en local** (nécessite cloud + GPU) | Garder cloud |
| **Embeddings RAG knowledge base** | bulk + on-query | 256 d | Gemini text-embedding | Ollama (Mac) | `nomic-embed-text` ou `mxbai-embed-large` |

### Modèles à installer sur le Mac mini (priorité)

#### Tier 1 — installation immédiate (recommandé, ~30 min)
```bash
# Ollama : framework le plus simple sur Mac (déjà optimisé Metal)
brew install ollama
ollama serve  # daemon en arrière-plan

# Modèles essentiels (en parallèle Tailscale exposé)
ollama pull qwen2.5:7b-instruct-q5_K_M     # ~5.5GB · texte court/moyen, multilingue, rapide
ollama pull llama3.1:8b-instruct-q5_K_M    # ~5.7GB · texte créatif, dialogue, sécurité
ollama pull qwen2.5:3b-instruct-q5_K_M     # ~2.4GB · modération yes/no, ultra-rapide
ollama pull nomic-embed-text                # ~270MB · embeddings RAG
```
**Espace total** : ~14 GB, RAM utilisée à l'inférence : 6-8 GB. Tu peux tourner 2 modèles en parallèle confortable.

#### Tier 2 — pour le texte créatif long (optionnel)
```bash
ollama pull qwen2.5:14b-instruct-q4_K_M    # ~9 GB · meilleur sur texte long, 24GB RAM OK
# (le 32B Q4 demanderait 18GB — feasable mais ralentit le système)
```

#### Tier 3 — STT (transcription témoignages vidéo)
```bash
brew install whisper-cpp
# Modèle large-v3-turbo : 1.5GB · 8x temps réel sur M4 Pro
# (ex: transcrit 1h de vidéo en 7 min)
```

#### Tier 4 — Image generation locale
- **Recommandé** : DiffusionBee (app Mac native, GUI, gère SDXL+FLUX)
- **Pour API** : ComfyUI (port 8188) avec workflow exposé
- **Modèles** : `flux1-schnell` (4 steps, 8GB VRAM apparent, ~3s/image sur M4 Pro)

### LM Studio — comment je l'utilise dans le plan

LM Studio expose déjà un serveur compatible OpenAI (`http://localhost:1234/v1/chat/completions`). On peut le configurer comme un provider parmi d'autres dans la nouvelle page `/admin/ai-settings`. Avantage : tu peux **swap** le modèle dans LM Studio GUI sans toucher au code GLD.

### llama.cpp — pour qui ?

llama.cpp en mode `--server` est plus rapide de **20-40%** qu'Ollama sur Apple Silicon (Metal Direct), MAIS plus complexe à configurer. Recommandation :
- Démarre avec **Ollama** (1 commande, gère l'orchestration)
- Migre vers **llama.cpp** si tu hits des limites de latence (cercles de prière live, modération temps-réel)

### Tailscale — feasibility

**Avantages** :
- Latence ajoutée Coolify (Paris) → Mac mini (chez toi) : **~30-80ms** typique en France, **+20ms transcontinental** si tu voyages. Vs Gemini API : ~150-300ms. **Donc en pratique, le local est PLUS rapide** dès que la requête vaut moins de 200ms côté inférence (Q5 7B sur M4 = ~150 t/s = 1-3s pour 300 tokens).
- Sécurisé par défaut (chiffré, isolé)
- Auth automatique via Magic DNS

**Inconvénients honnêtes** :
- Si ton Mac s'éteint, le site doit fallback ailleurs (d'où la chaîne de fallback que je vais coder)
- Pic de charge : si 100 users prient en même temps et que ça déclenche 100 modérations IA simultanées, le M4 Pro va saturer (1-2 reqs/s en parallèle réaliste avec 8B Q5). À ce stade, retour sur Gemini ou OpenRouter.

### Plan d'exécution recommandé (3 phases)

**Phase 1 (cette session — implémenté maintenant)**
1. Créer `lib/ai-provider.ts` qui abstrait Gemini en provider, ajoute Ollama, OpenRouter, LM Studio
2. Page `/admin/ai-settings` qui :
   - Liste tous les usages IA (les 13 du tableau ci-dessus)
   - Permet de mapper chaque usage à un provider+modèle
   - Affiche le statut live (ping) de chaque provider
   - Affiche cost/speed estimés
   - Configure la chaîne de fallback (ex: Ollama → Gemini → OpenRouter)
3. Endpoint `/api/admin/ai-providers/test` pour valider chaque provider config

**Phase 2 (2-3h, à faire toi-même)**
1. Sur ton Mac mini : `brew install ollama`, lancer `ollama pull qwen2.5:7b llama3.1:8b nomic-embed-text`
2. Configurer Tailscale auth-key dans Coolify env vars (pour que le serveur puisse atteindre le Mac)
3. Aller dans `/admin/ai-settings`, mapper les tâches au provider Ollama, activer fallback Gemini

**Phase 3 (futur, si besoin)**
- Ajouter llama.cpp pour les flux temps-réel
- Ajouter ComfyUI pour images
- Ajouter whisper.cpp pour transcriptions
- Ajouter Searxng (que tu as déjà) comme provider "web search" pour remplacer la grounded Gemini

### Coût estimé

| Provider | Coût |
|---|---|
| **Gemini free tier** (actuellement) | 0 € — limité à 1500 req/jour |
| **Gemini Pro payant** (au-delà) | ~0.30 € / 1M tokens out |
| **OpenRouter** (sans engagement) | 0.20-2.00 € / 1M tokens selon modèle |
| **Ollama Mac local** | 0 € marginal (juste l'élec : ~30 W × 24h × 0.20€/kWh = 0.14 €/jour) |
| **Plan recommandé GLD** | Ollama prioritaire, Gemini en fallback grounded uniquement | ~5 €/mois électricité + 0-20 €/mois Gemini selon volume |

### Mon verdict honnête sur la faisabilité

**OUI** c'est viable, mais avec ces limites :
- **80%** des appels IA actuels passent au local sans souci (modération, classification, manuel sections, AI text helper, persona compagnon)
- **15%** restent partagés (long créatif, RAG complexe) — local d'abord, fallback Gemini Pro sur quotas
- **5%** restent cloud forcé (image Imagen 3, vidéo fal.ai, avatar HeyGen, grounded Google Search) — pas réaliste de remplacer ça à court terme

L'architecture proposée donne :
- Tu reprends le contrôle sur la donnée (privacy)
- Tu réduis le coût Gemini de 70-80%
- Tu gagnes en latence sur les requêtes courtes
- Tu gardes la robustesse (fallbacks)

**Risque réel** : si ton Mac plante un jour de trafic fort, sans monitoring tu peux pas savoir. Je code donc dans la page `/admin/ai-settings` un dashboard de santé.

---

## D. Code livré dans cette session

1. `lib/ai-provider.ts` — abstraction multi-provider (Gemini + Ollama + OpenRouter + LM Studio + llama.cpp)
2. `/admin/ai-settings` — page de configuration complète
3. `/api/admin/ai-providers/test` — endpoint de validation de chaque provider
4. Migration progressive de `generateText()` pour utiliser le router

Ces fichiers permettent de switcher Gemini → Ollama sans toucher au reste du code, et de configurer les fallbacks.

---

*Plan rédigé honnêtement. Si tu veux que je commence le refactor multi-tenant (Option B), dis-le-moi.*
🌈 *La foi se conjugue au pluriel. Le code aussi.*
