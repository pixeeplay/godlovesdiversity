import Foundation

struct Photo: Identifiable, Codable {
    let id: String
    let url: String
    let placeName: String?
    let placeType: String?
    let address: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, url, placeName = "place_name", placeType = "place_type", address, createdAt = "created_at"
    }
}

struct Banner: Identifiable, Codable {
    let id: String
    let title: String
    let subtitle: String?
    let mediaUrl: String?
    let ctaText: String?
    let ctaUrl: String?
}

struct Verse: Codable {
    let text: String
    let reference: String?
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: Role
    let text: String
    enum Role { case user, model }
}

struct ChatTurn: Codable {
    let role: String
    let text: String
}
