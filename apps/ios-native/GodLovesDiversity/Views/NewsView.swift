import SwiftUI

struct NewsView: View {
    @State private var verse: Verse?
    @State private var email = ""
    @State private var subscribed = false
    @State private var sending = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    if let v = verse {
                        VStack(alignment: .leading, spacing: 10) {
                            Label("Verset du jour", systemImage: "book.fill")
                                .font(.caption.bold()).foregroundColor(.neonPink)
                            Text("« \(v.text) »").font(.body.italic()).foregroundColor(.white.opacity(0.9))
                            if let r = v.reference { Text(r).font(.caption).foregroundColor(.white.opacity(0.5)) }
                            Button {
                                Task { verse = await APIService.shared.fetchVerseOfTheDay() }
                            } label: {
                                Label("Rafraîchir", systemImage: "arrow.clockwise")
                                    .font(.caption.bold()).foregroundColor(.neonCyan)
                            }
                        }
                        .padding(18).frame(maxWidth: .infinity, alignment: .leading)
                        .background(.white.opacity(0.05))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.1)))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                        .padding(.horizontal)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Newsletter").font(.title2.bold()).foregroundColor(.white)
                        Text("Recevez nos actualités, témoignages et événements.").font(.subheadline).foregroundColor(.white.opacity(0.7))
                        TextField("votre@email.com", text: $email)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(14).background(.white.opacity(0.06))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .foregroundColor(.white)
                        Button {
                            Task {
                                sending = true
                                let ok = await APIService.shared.subscribeNewsletter(email: email)
                                sending = false
                                if ok { subscribed = true; email = "" }
                            }
                        } label: {
                            HStack {
                                if sending { ProgressView().tint(.white) }
                                Text(subscribed ? "Inscrit !" : "S'abonner").bold()
                            }
                            .frame(maxWidth: .infinity).padding(.vertical, 14)
                            .background(LinearGradient(colors: [.neonPink, .neonViolet], startPoint: .leading, endPoint: .trailing))
                            .foregroundColor(.white).clipShape(Capsule())
                        }
                        .disabled(sending || email.isEmpty)
                    }
                    .padding(20)
                    .background(.white.opacity(0.04))
                    .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.1)))
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal)

                    Spacer(minLength: 40)
                }
            }
            .background(Color.brandDark.ignoresSafeArea())
            .navigationTitle("News")
            .task { verse = await APIService.shared.fetchVerseOfTheDay() }
        }
    }
}
