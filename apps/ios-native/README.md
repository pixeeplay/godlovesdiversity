# GodLovesDiversity — iOS / iPadOS natif (SwiftUI pur)

App native iOS / iPadOS sans Expo, sans React Native, sans CocoaPods.
Build instantané dans Xcode, zéro warning de tiers.

## Lancer

```bash
open ~/Desktop/godlovedirect/apps/ios-native/GodLovesDiversity.xcodeproj
```

Dans Xcode :
1. En haut, choisis le simulateur **iPhone 15** (ou ton iPhone connecté en USB)
2. Cmd+R

C'est tout. Build en moins de 10 secondes.

## Pour déployer sur ton iPhone réel

1. Connecte ton iPhone en USB
2. Dans Xcode → onglet du projet → **Signing & Capabilities** → choisis ton équipe (Apple ID gratuit suffit)
3. Le bundle ID `com.pixeeplay.godlovesdiversity` peut nécessiter un suffixe (ex: `.tonpseudo`) si déjà utilisé
4. Cmd+R

## Architecture

```
GodLovesDiversity/
├── GodLovesDiversityApp.swift   # @main
├── ContentView.swift            # TabView 5 onglets
├── Info.plist                   # Permissions FR
├── Models/
│   └── Models.swift             # Photo, Banner, Verse, ChatMessage
├── Services/
│   └── APIService.swift         # URLSession → gld.pixeeplay.com
├── Views/
│   ├── HomeView.swift           # Hero + cœur néon Canvas + verset + photos
│   ├── GalleryView.swift        # Grille filtrable
│   ├── CaptureView.swift        # PhotosPicker + GPS + upload
│   ├── NewsView.swift           # Verset + newsletter
│   ├── ProfileView.swift        # Don + liens vers le site
│   └── ChatView.swift           # Chat IA "Demandez à GLD"
└── Assets.xcassets
```

## Endpoints utilisés

- `GET  /api/photos` — galerie
- `GET  /api/banners?locale=fr` — bannières home
- `GET  /api/verse-of-the-day` — verset
- `POST /api/ai/chat` — chat IA
- `POST /api/newsletter/subscribe` — abonnement
- `POST /api/upload` — multipart upload photo

Tous backed par https://gld.pixeeplay.com.

## Pas de dépendances

Tout est en API standard Apple : SwiftUI, URLSession, PhotosUI, CoreLocation, Canvas pour le cœur néon.
Aucun `pod install`, aucun `npm install`, aucune autoconfiguration.
