import SwiftUI

struct GalleryView: View {
    @State private var photos: [Photo] = []
    @State private var filter: String = "all"
    @State private var loading = true

    let columns = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]

    var filtered: [Photo] {
        if filter == "all" { return photos }
        return photos.filter { ($0.placeType ?? "").lowercased() == filter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // FILTER BAR
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(label: "Tout", value: "all", current: $filter)
                        FilterChip(label: "Églises", value: "church", current: $filter)
                        FilterChip(label: "Mosquées", value: "mosque", current: $filter)
                        FilterChip(label: "Synagogues", value: "synagogue", current: $filter)
                        FilterChip(label: "Temples", value: "temple", current: $filter)
                    }
                    .padding(.horizontal).padding(.vertical, 10)
                }
                .background(.ultraThinMaterial)

                if loading {
                    Spacer(); ProgressView().tint(.neonPink); Spacer()
                } else if filtered.isEmpty {
                    Spacer()
                    Text("Aucune photo pour ce filtre.").foregroundColor(.white.opacity(0.6))
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 8) {
                            ForEach(filtered) { p in
                                AsyncImage(url: URL(string: p.url.hasPrefix("http") ? p.url : "https://gld.pixeeplay.com\(p.url)")) { img in
                                    img.resizable().scaledToFill()
                                } placeholder: {
                                    Rectangle().fill(.white.opacity(0.05))
                                }
                                .frame(height: 180)
                                .clipped()
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(alignment: .bottomLeading) {
                                    if let name = p.placeName {
                                        Text(name).font(.caption2.bold()).foregroundColor(.white)
                                            .padding(6).background(.black.opacity(0.6))
                                            .clipShape(RoundedRectangle(cornerRadius: 6))
                                            .padding(6)
                                    }
                                }
                            }
                        }
                        .padding(8)
                    }
                }
            }
            .background(Color.brandDark.ignoresSafeArea())
            .navigationTitle("Galerie")
            .navigationBarTitleDisplayMode(.large)
            .task {
                photos = await APIService.shared.fetchPhotos()
                loading = false
            }
        }
    }
}

struct FilterChip: View {
    let label: String; let value: String; @Binding var current: String
    var body: some View {
        Button { current = value } label: {
            Text(label).font(.caption.bold())
                .padding(.horizontal, 14).padding(.vertical, 8)
                .background(current == value ? Color.neonPink : .white.opacity(0.08))
                .foregroundColor(current == value ? .white : .white.opacity(0.8))
                .clipShape(Capsule())
        }
    }
}
