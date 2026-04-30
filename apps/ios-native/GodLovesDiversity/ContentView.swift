import SwiftUI

extension Color {
    static let neonPink = Color(red: 1.0, green: 0.17, blue: 0.69)
    static let neonViolet = Color(red: 0.55, green: 0.36, blue: 0.96)
    static let neonCyan = Color(red: 0.13, green: 0.83, blue: 0.93)
    static let brandDark = Color(red: 0.04, green: 0.01, blue: 0.08)
    static let brandInk = Color(red: 0.07, green: 0.04, blue: 0.13)
}

struct ContentView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Accueil", systemImage: "heart.fill") }
            GalleryView()
                .tabItem { Label("Galerie", systemImage: "photo.on.rectangle.angled") }
            CaptureView()
                .tabItem { Label("Capturer", systemImage: "camera.fill") }
            NewsView()
                .tabItem { Label("News", systemImage: "newspaper.fill") }
            ProfileView()
                .tabItem { Label("Profil", systemImage: "person.crop.circle.fill") }
        }
        .tint(.neonPink)
    }
}

#Preview { ContentView().preferredColorScheme(.dark) }
