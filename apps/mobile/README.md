# 📱 God Loves Diversity — App iOS / iPadOS / Android

App mobile **Expo / React Native / TypeScript** connectée à l'API web sur https://gld.pixeeplay.com.

---

## 🎯 Fonctionnalités

| Onglet | Ce qu'il fait |
|---|---|
| **🩷 Accueil** | Hero néon, verset du jour IA, carrousel photos, CTA don rapide (Apple Pay), accès chat IA |
| **🖼 Galerie** | Filtres par type (Tout/Églises/Mosquées/Synagogues/Temples), vue **grille** ou **carte** (MapView avec marqueurs roses) |
| **📷 Capturer** | Caméra native (photo + **vidéo jusqu'à 30s**), géolocalisation auto, formulaire détails, upload vers `/api/upload` |
| **📰 News** | Inscription newsletter, verset du jour rafraîchissable |
| **👤 Profil** | Don Apple Pay, raccourcis vers le site web (message, argumentaire, affiches, newsletters), connexion BO admin |

Bonus :
- **Chat IA "Demandez à GLD"** (modal plein écran)
- **Détail photo** plein écran
- Auto-darkmode, safe area, gestes natifs iOS/iPadOS

---

## 🛠 Setup local (5 min)

### Prérequis
- macOS avec **Xcode 16+** installé (gratuit sur le Mac App Store)
- Node 20+ et npm
- Un iPhone/iPad ou un simulateur iOS

### Installation
```bash
cd ~/Desktop/godlovedirect/apps/mobile
npm install
```

### Génération du projet Xcode (`.xcodeproj`)
```bash
npx expo prebuild --platform ios --clean
```
Cela crée le dossier `ios/` avec `GodLovesDiversity.xcodeproj` ouvrable dans Xcode.

### Lancer en simulateur
```bash
npm run ios
```
Ou ouvre `ios/GodLovesDiversity.xcworkspace` dans Xcode et clique ▶.

### Lancer sur ton iPhone réel (USB)
```bash
npm run ios:device
```
La 1ʳᵉ fois Xcode te demandera de te connecter avec ton Apple ID (compte développeur gratuit suffit).

---

## 🚀 Distribution App Store / TestFlight

### Méthode 1 — EAS Build (recommandé, dans le cloud)
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios
```
EAS gère pour toi : signing, certificats, provisioning profiles, upload App Store Connect.

### Méthode 2 — Xcode direct
1. `npx expo prebuild --platform ios`
2. Ouvre `ios/GodLovesDiversity.xcworkspace`
3. Sélectionne ton équipe (Signing & Capabilities)
4. Product → Archive → Distribute App

---

## 🔧 Configuration

### Bundle Identifier
Dans `app.json` : `ios.bundleIdentifier`. Actuellement `com.pixeeplay.godlovesdiversity` — à adapter à ton compte développeur Apple si différent.

### URL de l'API
Par défaut : `https://gld.pixeeplay.com` (déjà en prod).
À changer dans `app.json` → `extra.apiBase` si tu déploies sur un autre domaine.

### Permissions iOS
Toutes les permissions sont déjà déclarées dans `app.json` avec messages français :
- 📸 Caméra
- 🎤 Micro (pour vidéo)
- 📍 Position (optionnelle, pour la carte)
- 🖼 Photothèque

---

## 📂 Structure

```
apps/mobile/
├── app/                          # Routes (expo-router)
│   ├── _layout.tsx               # Root stack
│   ├── (tabs)/                   # 5 onglets bas
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # 🩷 Accueil
│   │   ├── gallery.tsx           # 🖼 Galerie + carte
│   │   ├── capture.tsx           # 📷 Caméra
│   │   ├── news.tsx              # 📰 Newsletter
│   │   └── profile.tsx           # 👤 Profil
│   ├── photo/[id].tsx            # Détail photo (modal)
│   ├── login.tsx                 # Login admin (modal)
│   └── chat.tsx                  # Chat IA (modal)
├── components/
│   └── NeonHeart.tsx             # SVG cœur néon natif
├── lib/
│   └── api.ts                    # Wrapper fetch vers gld.pixeeplay.com
├── assets/                       # Icons, splash, etc.
├── app.json                      # Config Expo (permissions, bundle ID)
├── tailwind.config.js            # NativeWind (Tailwind RN)
└── package.json
```

---

## 🎨 Design

Les couleurs et la typo respectent le branding du site web :
- **Rose néon** `#FF2BB1`
- **Fond sombre** `#0a0314`
- **Polices système** (`-apple-system` sur iOS pour la perf)

Tu peux remplacer `assets/icon.png` et `assets/splash.png` par tes propres assets (1024×1024 recommandé pour l'icône).

---

## 🔐 Compte développeur Apple

Pour publier sur l'App Store il te faut :
- Un compte Apple Developer Program (99 $/an)
- Bundle Identifier unique (configuré dans `app.json`)
- Une fiche App Store Connect
- Screenshots iPhone 6.7" + iPad Pro 12.9"
- Une icône 1024×1024 PNG

Pour tester en local sur un appareil sans payer : connecte ton iPhone en USB, Xcode, login avec un Apple ID gratuit, "Run" → 7 jours de validité.

---

## 🆘 Si ça ne build pas

| Erreur | Solution |
|---|---|
| "No development team selected" | Ouvre `ios/GodLovesDiversity.xcworkspace` → Signing & Capabilities → choisis ton équipe |
| Pods qui ne s'installent pas | `cd ios && pod install` (puis `bundle exec pod install` si tu as bundler) |
| Permissions caméra refusées en simulateur | Le simulateur n'a pas de caméra. Teste sur un vrai iPhone. |
| Build échoue sur expo-camera | Vérifie que tu as fait `npx expo prebuild` après `npm install` |

Pour toute question, l'API web tourne déjà sur https://gld.pixeeplay.com — tu peux tester avec Postman avant que l'app soit prête.
