import SwiftUI

struct HomeView: View {
    @State private var verse: Verse?
    @State private var photos: [Photo] = []
    @State private var showChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 28) {
                    // HERO
                    VStack(spacing: 16) {
                        NeonHeart()
                            .frame(width: 180, height: 180)
                            .padding(.top, 20)
                        Text("God Loves Diversity")
                            .font(.system(size: 32, weight: .heavy, design: .rounded))
                            .foregroundStyle(LinearGradient(colors: [.neonPink, .neonViolet, .neonCyan],
                                                            startPoint: .leading, endPoint: .trailing))
                            .multilineTextAlignment(.center)
                        Text("Un mouvement interreligieux pour l'inclusion LGBTQ+")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 24)
                        HStack(spacing: 12) {
                            Button {
                                if let url = URL(string: "https://gld.pixeeplay.com/don") { UIApplication.shared.open(url) }
                            } label: {
                                Label("Faire un don", systemImage: "heart.fill")
                                    .font(.headline)
                                    .padding(.horizontal, 22).padding(.vertical, 12)
                                    .background(LinearGradient(colors: [.neonPink, .neonViolet], startPoint: .leading, endPoint: .trailing))
                                    .foregroundColor(.white)
                                    .clipShape(Capsule())
                            }
                            Button { showChat = true } label: {
                                Label("Demandez à GLD", systemImage: "sparkles")
                                    .font(.headline)
                                    .padding(.horizontal, 22).padding(.vertical, 12)
                                    .overlay(Capsule().stroke(Color.neonPink, lineWidth: 1.5))
                                    .foregroundColor(.white)
                            }
                        }
                    }

                    // VERSE
                    if let v = verse {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Verset du jour", systemImage: "book.fill")
                                .font(.caption.bold())
                                .foregroundColor(.neonPink)
                            Text("« \(v.text) »").font(.body.italic()).foregroundColor(.white.opacity(0.9))
                            if let r = v.reference {
                                Text(r).font(.caption).foregroundColor(.white.opacity(0.5))
                            }
                        }
                        .padding(18)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.white.opacity(0.05))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.1)))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .padding(.horizontal)
                    }

                    // PHOTOS
                    if !photos.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Lieux d'amour à travers le monde")
                                .font(.title3.bold()).foregroundColor(.white)
                                .padding(.horizontal)
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(photos.prefix(10)) { p in
                                        AsyncImage(url: URL(string: p.url.hasPrefix("http") ? p.url : "https://gld.pixeeplay.com\(p.url)")) { img in
                                            img.resizable().scaledToFill()
                                        } placeholder: {
                                            Rectangle().fill(.white.opacity(0.05))
                                        }
                                        .frame(width: 200, height: 240)
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                        .overlay(alignment: .bottomLeading) {
                                            if let name = p.placeName {
                                                Text(name).font(.caption.bold()).foregroundColor(.white)
                                                    .padding(8)
                                                    .background(.black.opacity(0.6))
                                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                                    .padding(8)
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    Color.clear.frame(height: 40)
                }
            }
            .background(LinearGradient(colors: [.brandDark, .brandInk], startPoint: .top, endPoint: .bottom))
            .navigationBarHidden(true)
            .task {
                async let v = APIService.shared.fetchVerseOfTheDay()
                async let p = APIService.shared.fetchPhotos()
                verse = await v
                photos = await p
            }
            .sheet(isPresented: $showChat) { ChatView() }
        }
    }
}

// MARK: - Neon Heart (pure SwiftUI Canvas)
struct NeonHeart: View {
    let colors: [Color] = [.neonPink, .neonViolet, .neonCyan,
                           Color(red: 0.2, green: 0.83, blue: 0.6),
                           Color(red: 0.98, green: 0.75, blue: 0.14),
                           Color(red: 0.94, green: 0.27, blue: 0.27)]
    var body: some View {
        Canvas { ctx, size in
            let cx = size.width/2, cy = size.height/2
            for (i, c) in colors.enumerated() {
                let scale = 1.0 - Double(i) * 0.13
                var path = Path()
                let s = min(size.width, size.height) * 0.45 * scale
                path.move(to: CGPoint(x: cx, y: cy + s*0.8))
                path.addCurve(to: CGPoint(x: cx, y: cy - s*0.4),
                              control1: CGPoint(x: cx - s*1.2, y: cy + s*0.3),
                              control2: CGPoint(x: cx - s*0.4, y: cy - s*0.7))
                path.addCurve(to: CGPoint(x: cx, y: cy + s*0.8),
                              control1: CGPoint(x: cx + s*0.4, y: cy - s*0.7),
                              control2: CGPoint(x: cx + s*1.2, y: cy + s*0.3))
                ctx.stroke(path, with: .color(c.opacity(0.95 - Double(i)*0.08)),
                           style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
            }
        }
        .shadow(color: .neonPink.opacity(0.6), radius: 20)
    }
}
