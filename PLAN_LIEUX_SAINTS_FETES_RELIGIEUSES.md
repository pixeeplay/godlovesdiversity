# 🕊 Plan : Lieux saints + Calendrier des fêtes religieuses mondiales
**Date :** 6 mai 2026 · **Pour :** God Loves Diversity

---

## 🎯 Objectif

Faire de GLD **la** référence inclusive pour :
1. Les **lieux saints LGBT-friendly ou ouverts** (église, mosquée, synagogue, temple, gurdwara, etc.) géolocalisés sur une carte mondiale.
2. Le **calendrier annuel** complet de toutes les fêtes/événements religieux par confession, avec note d'inclusivité par lieu.
3. La possibilité pour la communauté de **prier ensemble** virtuellement, **partager** une intention, **assister** à un office en visio.

---

## 📊 État actuel de la base (au 6 mai 2026)

### Lieux total : **2 694 venues** importés
Statut typage : la quasi-totalité est sur `type = OTHER` car l'import initial n'a pas catégorisé. La taxonomie cible existe déjà dans Prisma :

```ts
enum VenueType {
  RESTAURANT
  BAR
  CAFE
  CLUB
  HOTEL
  SHOP
  CULTURAL
  CHURCH         ← ÉGLISES
  TEMPLE         ← TEMPLES (bouddhiste/hindou)
  COMMUNITY_CENTER
  HEALTH
  ASSOCIATION
  OTHER
}
```

**Manque dans le schéma actuel** : `MOSQUE`, `SYNAGOGUE`, `GURDWARA`, `MEDITATION_CENTER`. À ajouter.

### Géocodage : **54 / 2 694 (2 %)**
→ chantier prioritaire P0 pour pouvoir afficher tous les lieux sur la carte mondiale.

---

## 🗺 Sprint 1 — Reclassifier les venues religieuses (1 semaine)

### Étape 1.1 — Étendre l'enum VenueType
Migration Prisma pour ajouter :
```prisma
enum VenueType {
  ... existant ...
  CHURCH_CATHOLIC
  CHURCH_PROTESTANT
  CHURCH_ORTHODOX
  CHURCH_ANGLICAN
  CHURCH_EVANGELICAL
  CHURCH_OTHER
  MOSQUE
  SYNAGOGUE
  TEMPLE_BUDDHIST
  TEMPLE_HINDU
  GURDWARA
  MEDITATION_CENTER
  HOLY_SITE          // Vatican, Mecque, Jérusalem, Lourdes, etc.
  PILGRIMAGE_PATH    // Compostelle, Hajj, Bénarès
  INTERFAITH_CENTER
}
```

### Étape 1.2 — Auto-classification IA des 2 694 lieux
Cron `/api/cron/classify-venues` :
- Boucle les venues `type=OTHER`
- Gemini grounded search : "ce lieu est-il un lieu de culte ? Si oui, lequel ?"
- Confidence ≥ 0.7 → reclassifie automatiquement
- Confidence 0.4-0.7 → flag pour review admin
- Confidence < 0.4 → reste OTHER

Estimation : ~30 min de quota Gemini (1500 req/jour free tier suffisant).

### Étape 1.3 — Nouveau filtre confessionnel sur `/lieux`
Pills par confession (déjà au-dessus des autres filtres) : **Tous · Catholique · Protestant · Orthodoxe · Musulman · Juif · Bouddhiste · Hindou · Sikh · Inter-religieux · LGBT-friendly seulement**.

Toggle additionnel : **"Inclusif vérifié"** (badge GLD) vs "Tolérant connu" vs "Non vérifié".

---

## 📅 Sprint 2 — Calendrier des fêtes religieuses mondiales (1 semaine)

### Étape 2.1 — Nouveau modèle `ReligiousEvent`
```prisma
model ReligiousEvent {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String           // "Pâques catholique", "Aïd al-Fitr", "Yom Kippour", "Diwali"
  faith        String           // "catholic"|"protestant"|"orthodox"|"muslim"|"jewish"|"buddhist"|"hindu"|"sikh"|"interfaith"
  category     String           // "fete-majeure"|"fete-mineure"|"jeune"|"ramadan"|"shabbat"|"pelerinage"
  dateMode     String           // "fixed"|"lunar"|"computed"
  fixedMonth   Int?             // si dateMode=fixed (1-12)
  fixedDay     Int?             // si dateMode=fixed
  computeKey   String?          // ex "easter-sunday-orthodox", utilisé par calcul JS
  duration     Int      @default(1)  // jours
  description  String?  @db.Text
  inclusivityNote String? @db.Text   // "officie inclusif possible dans paroisses LGBT-friendly..."
  emoji        String?
  color        String?           // pour UI calendrier
  createdAt    DateTime @default(now())
}
```

### Étape 2.2 — Seed initial des grandes fêtes (cron annuel + manuel)
Calendrier source à pré-remplir (script `prisma/seed-religious-events.ts`) :

**Christianisme**
- Pâques (catholique + orthodoxe — dates différentes)
- Pentecôte
- Noël (25 déc) · Épiphanie (6 jan)
- Toussaint (1 nov) · Carême (40 jours avant Pâques)
- Mercredi des Cendres
- Saint-Patrick (17 mars)
- Assomption (15 août)
- Avent (4 dimanches avant Noël)

**Islam**
- Ramadan (mois lunaire, dates calculées)
- Aïd al-Fitr (fin Ramadan)
- Aïd al-Adha (fête du sacrifice, ~70 jours après Aïd al-Fitr)
- Mawlid (naissance du Prophète)
- Achoura (10 Muharram)
- Laylat al-Qadr (nuit du destin, 27e Ramadan)
- Hajj (pèlerinage, 8-13 Dhul Hijjah)

**Judaïsme**
- Roch Hachana (nouvel an, sept/oct)
- Yom Kippour (10 jours après)
- Souccot (8 jours)
- Hanouka (8 jours, déc)
- Pourim (mars)
- Pessa'h (Pâque juive, mars-avril, 7 jours)
- Chavouot (50 jours après Pessa'h)
- Tisha BeAv (jeûne, été)

**Bouddhisme**
- Vesak (naissance/illumination/parinirvana du Bouddha — pleine lune mai)
- Asalha Puja (premier sermon du Bouddha — pleine lune juillet)
- Magha Puja (1250 disciples — pleine lune février/mars)
- Ulambana / Bon (festival des esprits)
- Losar (nouvel an tibétain)

**Hindouisme**
- Diwali (festival des lumières, oct/nov)
- Holi (festival des couleurs, mars)
- Ganesh Chaturthi (sept)
- Navratri (9 nuits, oct)
- Maha Shivaratri (fév/mars)
- Krishna Janmashtami (août)
- Raksha Bandhan
- Kumbh Mela (tous les 3 ans, lieux tournants)

**Sikhisme**
- Vaisakhi (13/14 avril)
- Diwali sikh
- Guru Nanak Jayanti (nov)

**Inter-religieux / Universel**
- Journée mondiale du dialogue inter-religieux (janvier ONU)
- Pride Month (juin) avec angle foi+orientation
- World AIDS Day (1 décembre)

→ **~70 événements seed** à pré-remplir.

### Étape 2.3 — Page publique `/calendrier-religieux`
- **Vue liste** : tous les événements à venir, filtre par confession (multi-select), filtre "inclusif"
- **Vue calendrier** : grille mois-par-mois, codes couleur par confession, emoji par fête
- **Vue carte mondiale** : événements + lieux qui les célèbrent (cluster Leaflet)
- **Détail d'un événement** : description, signification, comment GLD le célèbre, liste des lieux participants, bouton "Rejoindre la prière virtuelle"

### Étape 2.4 — Croisement événements ↔ lieux
Quand un lieu (ex. Cathédrale Notre-Dame) célèbre un événement (Pâques), on relie via une table `VenueParticipation` :
```prisma
model VenueParticipation {
  venueId          String
  religiousEventId String
  year             Int
  startsAt         DateTime
  isInclusive      Boolean  // affiche un cœur arc-en-ciel si oui
  livestreamUrl    String?
  notes            String?
  @@id([venueId, religiousEventId, year])
}
```

→ permet sur la carte de **filtrer par fête à venir cette semaine**.

---

## 🙏 Sprint 3 — Expérience virtuelle de prière (2 semaines)

### Étape 3.1 — Salle de prière live (refondre `/cercles-priere`)
Existant : 7 cercles statiques (catholique, protestant, musulman, juif, bouddhiste, hindou, inter-religieux) avec horaires hebdomadaires.

**Améliorations** :
- Bouton **"Rejoindre maintenant"** quand un cercle est actif (heure courante dans la fenêtre déclarée)
- **Compteur live** des personnes connectées par cercle (SSE)
- **Avatars anonymes** circulaires (fond gradient confession-couleur, initiale ou cœur arc-en-ciel)
- **Bouton "Prier en silence"** : présence sans micro/cam (juste avatar visible)
- Possibilité de **partager une intention** texte (modérée IA) qui apparaît dans le fil de la session
- **Transcription IA** opt-in : sous-titres en direct pour malentendants (Web Speech API)

### Étape 3.2 — Carte des prières mondiales en direct
Heatmap monde basée sur les intentions et présences prières :
- Chaque connexion à un cercle → ping anonyme sur la carte
- Visualisation en temps-réel : "12 personnes prient avec toi en ce moment, dans 8 pays"
- Animation : pulses sortant des points
- **Option "Allumer une bougie virtuelle"** : pose un point lumineux sur la carte, persistant 24h, avec intention texte optionnelle

### Étape 3.3 — Quête spirituelle gamifiée (optionnel, Sprint 4)
Concept "Camino virtuel" : la communauté avance ensemble sur des chemins de pèlerinage.
- Chemins disponibles : Compostelle (FR/ES), Bénarès (Inde), Mecque (interdit non-musulmans IRL → version virtuelle libre), Jérusalem, Vatican, Camino Inca
- Chaque cercle de prière hebdomadaire → +1 km collectif
- Étapes virtuelles avec photo + extrait de texte sacré + invitation à méditer
- Badge "Pèlerin GLD" quand un chemin est terminé

---

## 🎭 Sprint 4 — Avatar IA spirituel + interactions (2 semaines)

### Étape 4.1 — Avatar IA "Compagnon spirituel"
Existant : Avatar IA via HeyGen + Live Gemini Realtime (déjà branché dans `/admin/avatar`).

**Spécialisation pour le spirituel** :
- 4 personas configurables : Mère Marie (catho), Sœur ouverte (islam progressiste), Rabbin Beit Haverim, Maître Zen
- Chaque persona a un knowledge base RAG dédié (textes sacrés annotés inclusifs)
- L'utilisateur peut poser des questions privées : "Je suis gay et catholique, est-ce que Dieu m'aime ?" → réponse théologique grounded + bienveillante
- Audit trail : chaque question est anonymisée et journalisée pour amélioration du modèle

### Étape 4.2 — Interactions communautaires
- **Prêt de textes sacrés annotés** : la communauté upload ses notes en marge sur des passages bibliques/coraniques/talmudiques. Comme un Genius pour textes sacrés inclusifs.
- **Cercle des "bonnes nouvelles"** : feed d'histoires inspirantes (coming-out réussi en milieu religieux, paroisse devenue inclusive, etc.)
- **Champ d'intentions** : page publique liste les intentions postées en cercles, avec compteur "Combien prient pour toi". Anonymisable.

---

## 🛠 Implémentation technique : ce qui existe déjà

| Brique | État | Note |
|---|---|---|
| Carte interactive Leaflet | ✅ Live | À étendre avec couches confession |
| Annuaire venues 2694 | ✅ Live | Reclassification IA à lancer |
| Cercles de prière hebdo | ✅ Live (statique) | Évoluer en live SSE |
| Avatar IA HeyGen + Gemini Realtime | ✅ Live | À spécialiser par persona |
| Knowledge base RAG | ✅ Live (`/admin/ai/knowledge`) | Ajouter docs théologiques inclusifs |
| Modération IA | ✅ Live | Critique pour intentions publiques |
| i18n 10 langues | ✅ Live | Étendre aux nouveaux contenus |
| Cron jobs Coolify | ✅ Live | +classify-venues, +seed-religious-events |
| Manuels auto IA | ✅ Live | Une section "Spiritualité virtuelle" |

**À développer** :
- 📦 Migration Prisma : VenueType étendu + ReligiousEvent + VenueParticipation
- 🛠 Endpoints API : `/api/religious-events`, `/api/prayer-rooms/[slug]/join`, `/api/prayer-candles`
- 🎨 Pages : `/calendrier-religieux`, refonte `/cercles-priere/[id]`, `/lieux-saints` (sous-vue de /lieux filtrée)
- ⚙ Crons : `classify-venues`, `recompute-religious-dates` (annuel)
- 🤖 Personas IA : 4 prompts système + 4 knowledge bases dédiées

---

## 💰 ROI estimé (3 mois)

- **+50 % engagement** sur cercles de prière (présence live > chiffre statique)
- **+20 venues religieux par semaine** auto-classés par IA
- **Effet de communauté** : carte des prières en direct → viralité (screenshots partagés)
- **Différenciation** : aucun autre site interreligieux LGBT n'offre ça
- **SEO** : 70 pages événements religieux → trafic organique majeur

---

## 📋 Plan d'exécution priorisé

### Cette semaine (P0)
1. Migration Prisma : étendre VenueType + ajouter ReligiousEvent
2. Seed 70 événements religieux principaux
3. Page publique `/calendrier-religieux` MVP

### Semaine prochaine (P1)
4. Cron `classify-venues` IA (Gemini grounded search)
5. Filtre confessionnel sur `/lieux`
6. Géocodage massif des 2 640 venues restantes (Nominatim cron nuit)

### Mois suivant (P2)
7. Refonte `/cercles-priere` en live SSE avec présence + intentions
8. Carte mondiale des prières en direct (heatmap + bougies virtuelles)
9. Persona IA "Compagnon spirituel" 4 personas

### Long terme (P3)
10. Quête Camino virtuel
11. Prêt de textes sacrés annotés
12. Marketplace inter-paroisses inclusives (revenue share)

---

*Plan rédigé par Claude · 6 mai 2026 · à valider avec ton équipe avant kickoff.*
🌈 *La foi se conjugue au pluriel.*
