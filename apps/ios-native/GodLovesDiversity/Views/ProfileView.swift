import SwiftUI

struct ProfileView: View {
    @State private var showChat = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Donate hero
                    VStack(spacing: 12) {
                        Image(systemName: "heart.circle.fill")
                            .font(.system(size: 70))
                            .foregroundStyle(LinearGradient(colors: [.neonPink, .neonViolet], startPoint: .top, endPoint: .bottom))
                        Text("Soutenez le mouvement").font(.title3.bold()).foregroundColor(.white)
                        HStack(spacing: 10) {
                            DonateBtn(amount: 5)
                            DonateBtn(amount: 10)
                            DonateBtn(amount: 20)
                        }
                    }
                    .padding(20)
                    .frame(maxWidth: .infinity)
                    .background(LinearGradient(colors: [.neonPink.opacity(0.15), .neonViolet.opacity(0.15)],
                                                startPoint: .topLeading, endPoint: .bottomTrailing))
                    .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.neonPink.opacity(0.3)))
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal)

                    // Quick links
                    VStack(spacing: 0) {
                        LinkRow(icon: "sparkles", label: "Demandez à GLD (chat IA)") { showChat = true }
                        LinkRow(icon: "text.bubble.fill", label: "Notre message", url: "https://gld.pixeeplay.com/message")
                        LinkRow(icon: "doc.text.fill", label: "Argumentaire", url: "https://gld.pixeeplay.com/argumentaire")
                        LinkRow(icon: "rectangle.stack.fill", label: "Affiches", url: "https://gld.pixeeplay.com/affiches")
                        LinkRow(icon: "envelope.fill", label: "Archive newsletters", url: "https://gld.pixeeplay.com/newsletters")
                        LinkRow(icon: "globe", label: "Site web", url: "https://gld.pixeeplay.com")
                        LinkRow(icon: "lock.fill", label: "Connexion admin (BO)", url: "https://gld.pixeeplay.com/admin", divider: false)
                    }
                    .background(.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.1)))
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal)

                    Text("v1.0 · Made with rose néon").font(.caption2).foregroundColor(.white.opacity(0.4))
                    Spacer(minLength: 40)
                }
                .padding(.top, 12)
            }
            .background(Color.brandDark.ignoresSafeArea())
            .navigationTitle("Profil")
            .sheet(isPresented: $showChat) { ChatView() }
        }
    }
}

struct DonateBtn: View {
    let amount: Int
    var body: some View {
        Button {
            if let url = URL(string: "https://gld.pixeeplay.com/don?amount=\(amount)") {
                UIApplication.shared.open(url)
            }
        } label: {
            Text("\(amount) €").font(.headline.bold())
                .padding(.horizontal, 22).padding(.vertical, 12)
                .background(.white)
                .foregroundColor(.neonPink)
                .clipShape(Capsule())
        }
    }
}

struct LinkRow: View {
    let icon: String
    let label: String
    var url: String? = nil
    var action: (() -> Void)? = nil
    var divider: Bool = true

    var body: some View {
        Button {
            if let action { action() }
            else if let s = url, let u = URL(string: s) { UIApplication.shared.open(u) }
        } label: {
            VStack(spacing: 0) {
                HStack {
                    Image(systemName: icon).foregroundColor(.neonPink).frame(width: 28)
                    Text(label).foregroundColor(.white)
                    Spacer()
                    Image(systemName: "chevron.right").foregroundColor(.white.opacity(0.3)).font(.caption)
                }
                .padding(.vertical, 14).padding(.horizontal, 18)
                if divider { Divider().background(.white.opacity(0.08)) }
            }
        }
    }
}
