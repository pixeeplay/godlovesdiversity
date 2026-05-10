# 💍 Plan v2 — Agent contacts pour photographe de mariage

> Objectif : 1000 contacts/mois, budget 50€ max, cibles **futurs mariés (B2C)** + **pros du salon mariage (B2B)**.

---

## 1. Tes 2 cibles distinctes (avec stratégies différentes)

### 🎯 Cible A — Futurs mariés (B2C)
**Qui** : couples qui vont se marier dans les 6-18 prochains mois.
**Volume cible** : 600 contacts/mois.

**Sources prioritaires :**
| Source | Type contact | Volume estimé | Coût | Légalité |
|---|---|---|---|---|
| **Mariages.net** (recherches couples) | Email + tel via formulaire devis | ~50/jour | Gratuit (scrape soft) | ⚠️ ToS strict — éviter scrape massif |
| **Zankyou.fr** | Bio publique mariés | ~30/jour | Gratuit | OK |
| **Instagram hashtags** `#futuremariee2026` `#mariage2026` `#fiancée` | Bio Insta + DM | ~100/jour | Gratuit (API limitée) | ⚠️ Bio publique seulement |
| **Sites perso mariage** (`monmariage.com/[couple]`) | Email + tel | ~20/jour | Gratuit | OK |
| **Pinterest moodboards mariage** | Profil + email si public | ~30/jour | Gratuit | OK |
| **Listes invités sur Facebook events** | Tag + invitation | ~10/jour | Gratuit (event public) | ⚠️ |

**Mots-clés agent IA** :
> *« Future mariée », « se marie en 2026 », « save the date », « mariage automne 2026 », « bague de fiançailles », « préparatifs mariage », « je dis oui en ... »*

**Filtres** :
- Localisation : France + DOM-TOM (ou ta zone d'intervention)
- Date prévue : 6-18 mois dans le futur
- Pas encore engagés avec un photographe (= pas de "@photo" dans bio Insta)

### 💼 Cible B — Pros du salon mariage (B2B)
**Qui** : exposants des salons + leurs partenaires (pour networking, partenariats croisés, recommandations).
**Volume cible** : 400 contacts/mois.

**Sources prioritaires :**
| Source | Type | Volume | Coût | Légalité |
|---|---|---|---|---|
| **Liste exposants** salons mariage officiels | Email + tel pro | 200-500/salon | Gratuit (sites publics) | ✅ B2B OK |
| **Google Places API** "photographe mariage Paris" | Email + tel + GMaps | ~20/ville | $200 credits gratuits | ✅ Excellent |
| **Mariages.net annuaire pros** | Page pro + tel | 50/jour | Gratuit (scrape soft) | OK |
| **Apollo.io** (49€/mois — DANS TON BUDGET) | Email vérifié + LinkedIn + poste | 1200/mois | 49€ | ✅ Légal |
| **Annuaires verticaux** (mariages-net, weddingplanner.fr) | Page contact | ~30/jour | Gratuit | OK |
| **LinkedIn via Apollo** | Wedding photographer / planner | 200-500/mois | Inclus Apollo | ✅ |

**Catégories pros à cibler** :
- Photographes mariage (concurrents → veille)
- Wedding planners / organisateurs
- Traiteurs mariage
- Fleuristes
- DJ / animateurs musicaux
- Salles de réception
- Robes de mariée / costume marié
- Maquilleuses / coiffeuses
- Vidéastes
- Officiants laïques

→ Les pros B2B sont une **mine d'or pour les recommandations croisées**.

---

## 2. Budget 50€/mois — Allocation optimale

```
✅ Apollo.io                49 €/mois   → 1200 enrichissements LinkedIn B2B (pros)
✅ Google Places API         0 €/mois   → 200$ free credits ≈ 12 000 reqs gratuit
✅ Notre scraper maison      0 €/mois   → web public + Insta bios + sites perso
✅ Gemini agent             ~0.50 €/mois → 1000 plans IA via Flash
✅ libphonenumber + MX       0 €/mois   → libs gratuites
─────────────────────────────────────────
TOTAL ≈ 49.50 €/mois — pile dans ton budget
```

**Volume mensuel attendu :**
- 600 leads B2C (scraper maison + Insta bios)
- 400 leads B2B (Apollo + Google Maps + scraper)
- = **1000 leads/mois validés** ✅

---

## 3. Légalité — points critiques pour TOI

### B2C (futurs mariés) — ⚠️ ATTENTION
- En France/UE, **prospection commerciale par email/SMS vers particuliers = consentement préalable obligatoire** (RGPD + LCEN).
- **Tu NE PEUX PAS leur envoyer un cold email** depuis un scrape même si t'as leur adresse.

**Stratégies LÉGALES qui marchent pour toi** :
1. **DM Instagram** : OK si profil public — c'est de la conversation 1-1, pas de la pub mass-mail
2. **Commenter leurs posts** avec offre douce ("J'adore votre projet, voici mon portfolio…")
3. **Liker / suivre + faire valoir tes contenus** — algo Insta te recommandera à eux
4. **Re-targeting Meta Ads** : upload la liste d'emails dans Facebook Ads → ils voient tes pubs (tu n'envoies rien direct)
5. **Lookalike audiences Meta** : Facebook trouve des couples similaires
6. **Mailing chez les pros qu'ils consultent** (Mariages.net publicité ciblée par Mariages.net eux-mêmes — légal car tu paies une plateforme tierce qui a leur consentement)

→ **Le scraper te sert à VOIR tes futurs clients, pas à les démarcher en cold mail.**

### B2B (pros salons) — ✅ Plus souple
- Cadre LCEN allège : tu peux contacter une **adresse email pro liée à une fonction** sans consentement.
- Reste interdit : cold call automatisé, SMS de masse.
- **OK** : email perso prospection avec opt-out explicite + RGPD mention.

---

## 4. Templates de prospection (que je peux générer)

### B2B — Email pro (Apollo lead)
```
Bonjour [Prénom],

Je suis Arnaud, photographe de mariage basé à [ville].
J'ai vu que vous êtes [poste] chez [entreprise] —
on se croise sûrement au Salon du Mariage de [ville] le [date].

J'aurais aimé vous proposer un partenariat photo pour vos clients :
[lien portfolio + offre exclusive partenaire]

Au plaisir de vous rencontrer,
Arnaud — [tel] — [insta]

(Si vous préférez ne plus recevoir de mes emails : [unsubscribe])
```

### B2C — DM Instagram (futur marié détecté)
```
Coucou [prénom] 💍
J'ai vu votre annonce de mariage pour [date] — félicitations !
Je suis photographe de mariage à [ville], je serais ravi
de vous montrer mon style en 30 sec : [lien insta reel]
Si jamais vous cherchez encore un photographe ✨
```

### B2C — Re-targeting (sans email direct)
- Upload liste d'emails dans Meta Ads Manager → "Custom Audience"
- Lance ad campaign avec tes plus belles photos
- CTA : "Demander un devis"
- **Légal** car c'est Meta qui montre les pubs, pas toi qui mailles

---

## 5. Workflow opérationnel — un mois type

### Semaine 1 — Scrape automatisé (lance le agent IA)
- **Lundi matin** : agent lance scrape "Pros salon mariage [ville prochaine]"
- **Lundi soir** : 200-400 emails B2B dans `/admin/leads` tag `salon-paris-2026`
- **Jeudi matin** : agent lance scrape "Futurs mariés FR 2026" via Insta hashtags
- **Vendredi** : 500-800 leads B2C dans `/admin/leads` tag `b2c-mariage-2026`

### Semaine 2 — Tri & qualification
- Marque les leads B2B intéressants en `qualified`
- Score les leads B2C par "fraîcheur" (data de mariage proche, bio recente)
- Créé segments :
  - `b2b-pros-salon-paris-jan` (200 leads)
  - `b2c-mariage-printemps-paris` (150 leads)
  - `b2c-mariage-ete-cote-azur` (100 leads)

### Semaine 3 — Prospection
- B2B : 50 emails personnalisés/jour via Resend + templates
- B2C : 30 DM Insta/jour + upload audience Meta Ads (campagne 100€/mois externe)

### Semaine 4 — Suivi & nurturing
- Réponses aux emails → create `LeadInteraction` (déjà dans le model)
- Convertis qualifiés en clients dans CRM
- Reviews du salon mariage → demande recommandations

---

## 6. UI dédiée mariage à créer

### Wizard `/admin/leads/scraper/new` étapes adaptées

**Step 1 — Type de cible (1 clic)**
- 🎂 Futurs mariés (B2C)
- 💼 Pros du salon mariage (B2B)
- 📋 Custom (mode avancé)

**Step 2 — Précisions selon choix**

Si "Futurs mariés" :
- Région : sélecteur villes/régions
- Période mariage : 6-12 mois / 12-18 mois / +18 mois
- Style recherché : champêtre / chic / bohème / urbain / aucune préférence
- Sources : Mariages.net / Zankyou / Insta hashtags / sites perso

Si "Pros salon" :
- Salon ciblé (auto-suggéré : Salon du Mariage Paris, Lyon, Marseille…)
- Catégorie : tous / photographes / planners / traiteurs / fleuristes / DJ
- Sources : Apollo / Google Maps / liste exposants

**Step 3 — Volume cible** : 100 / 300 / 500 / 1000

**Step 4 — Plan IA** : Gemini propose les 30 URLs sources → tu valides → launch

### Dashboard `/admin/leads/scraper`
- Cards stats par type :
  - "B2C ce mois : 234/600 — 39% du goal"
  - "B2B ce mois : 187/400 — 46% du goal"
- Sparkline contacts/jour
- Job en cours avec progression live
- Telegram notif quand done : *"✅ 187 contacts trouvés — voir la liste"*

---

## 7. Phases d'implémentation revues (8 commits — ~1h30 autopilot)

1. **Phase 1 — Detectors + Validators** ← *je le fais maintenant*
2. **Phase 2 — Adapter web** (mariages.net, zankyou, sites perso)
3. **Phase 3 — Adapter Google Maps Places API** (pros mariage par ville)
4. **Phase 4 — Adapter Apollo.io** (pros B2B LinkedIn)
5. **Phase 5 — Adapter Instagram public** (bios + hashtags)
6. **Phase 6 — Workers BullMQ + Agent IA orchestrateur**
7. **Phase 7 — UI Wizard mariage + Dashboard**
8. **Phase 8 — Templates emails B2B + DM Insta + Meta Audiences upload**

---

## 8. Points légaux à intégrer dans l'UI

L'admin doit montrer un **disclaimer légal** au premier lancement de scraper B2C :
> ⚠️ La prospection par email/SMS vers des particuliers nécessite leur consentement préalable.
> Tu peux récupérer leurs contacts pour analyse, mais pour les contacter, privilégie :
> 1. DM Instagram (conversation 1-1, pas de pub mass)
> 2. Meta Ads Custom Audience (upload + retargeting légal)
> 3. Réponse à leurs questions publiques (commentaires, formulaires)

Avec un bouton « J'ai compris, c'est pour analyse uniquement ».

---

## 9. Ce qui démarre maintenant (Phase 1)

Je commence tout de suite par les **detectors universels** — ils servent pour **toutes les phases suivantes**, peu importe la source.

```ts
// lib/contact-detectors.ts
extractEmails(text)     → [{ email, context, source }]
extractPhones(text, defaultCountry='FR')
                        → [{ e164, country, type, formatted }]
extractWhatsApp(text)   → [{ number, link }]
extractHandles(text)    → { linkedin, instagram, twitter, facebook, tiktok }

// lib/contact-validators.ts
validateEmailMx(email)  → { exists, mxRecords[], score }
normalizePhone(phone)   → E.164 + carrier + type
dedupeContacts(list)    → unique par email + phone
```

Puis je m'arrête, tu valides via Telegram (autopilot), et on passe à Phase 2.

---

## 10. Ta réponse pour démarrer

Choisis l'ordre que tu préfères :

**Option A — Démarrage progressif** (que je recommande)
> Phase 1 maintenant, push, tu testes, validation Telegram, Phase 2 demain, etc.

**Option B — Tout d'un coup**
> Je fais les 8 phases en autopilot avec Telegram approval à chaque jalon (~1h30).

**Option C — MVP minimaliste**
> Juste Phase 1 + 2 + 3 (web + Google Maps) — tu commences à scraper dès demain.

Réponds **A**, **B** ou **C** et c'est parti.
