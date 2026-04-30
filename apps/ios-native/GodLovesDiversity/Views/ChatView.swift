import SwiftUI

struct ChatView: View {
    @Environment(\.dismiss) var dismiss
    @State private var history: [ChatMessage] = []
    @State private var input = ""
    @State private var busy = false

    let suggestions = [
        "Que dit la Bible sur l'homosexualité ?",
        "Existe-t-il des églises inclusives ?",
        "Comment concilier ma foi et mon identité ?"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 12) {
                            if history.isEmpty {
                                VStack(spacing: 16) {
                                    Text("✨ Bonjour 🌈")
                                        .font(.title2).foregroundColor(.white)
                                    Text("Je suis GLD, l'assistant IA inclusif. Je réponds avec apaisement aux questions sur la foi et la diversité.")
                                        .multilineTextAlignment(.center)
                                        .foregroundColor(.white.opacity(0.7))
                                        .padding(.horizontal)
                                    VStack(spacing: 8) {
                                        ForEach(suggestions, id: \.self) { s in
                                            Button { Task { await send(s) } } label: {
                                                Text(s)
                                                    .frame(maxWidth: .infinity, alignment: .leading)
                                                    .padding(14)
                                                    .background(.white.opacity(0.06))
                                                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.1)))
                                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                                    .foregroundColor(.white.opacity(0.9))
                                            }
                                        }
                                    }
                                    .padding(.horizontal)
                                }
                                .padding(.top, 30)
                            }
                            ForEach(history) { m in
                                HStack {
                                    if m.role == .user { Spacer() }
                                    Text(m.text)
                                        .padding(12)
                                        .background(m.role == .user ? Color.neonPink : .white.opacity(0.08))
                                        .foregroundColor(.white)
                                        .clipShape(RoundedRectangle(cornerRadius: 16))
                                    if m.role == .model { Spacer() }
                                }
                                .padding(.horizontal)
                                .id(m.id)
                            }
                            if busy {
                                HStack {
                                    ProgressView().tint(.neonPink)
                                    Text("GLD réfléchit…").font(.caption).foregroundColor(.white.opacity(0.5))
                                    Spacer()
                                }.padding(.horizontal)
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .onChange(of: history.count) { _ in
                        if let last = history.last { withAnimation { proxy.scrollTo(last.id, anchor: .bottom) } }
                    }
                }

                HStack(spacing: 8) {
                    TextField("Pose ta question…", text: $input)
                        .padding(12)
                        .background(.white.opacity(0.06))
                        .clipShape(Capsule())
                        .foregroundColor(.white)
                        .onSubmit { Task { await send(input) } }
                    Button { Task { await send(input) } } label: {
                        Image(systemName: "paperplane.fill")
                            .foregroundColor(.white).padding(12)
                            .background(Color.neonPink)
                            .clipShape(Circle())
                    }
                    .disabled(busy || input.isEmpty)
                }
                .padding(12)
                .background(Color.brandInk)
            }
            .background(Color.brandDark.ignoresSafeArea())
            .navigationTitle("Demandez à GLD")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fermer") { dismiss() }.foregroundColor(.neonPink)
                }
            }
        }
    }

    func send(_ raw: String) async {
        let q = raw.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return }
        history.append(ChatMessage(role: .user, text: q))
        input = ""; busy = true
        let answer = await APIService.shared.chat(question: q, history: history.dropLast())
        history.append(ChatMessage(role: .model, text: answer))
        busy = false
    }
}

extension Array where Element == ChatMessage {
    func dropLast() -> [ChatMessage] { Array(self[0..<Swift.max(0, count - 1)]) }
}
