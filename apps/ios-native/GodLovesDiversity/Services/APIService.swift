import Foundation
import UIKit

enum APIError: Error { case badURL, badResponse, decoding }

final class APIService {
    static let shared = APIService()
    let baseURL = URL(string: "https://gld.pixeeplay.com")!

    // MARK: - Generic
    private func get<T: Decodable>(_ path: String) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        let (data, resp) = try await URLSession.shared.data(from: url)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw APIError.badResponse }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw APIError.decoding }
    }

    private func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        let url = baseURL.appendingPathComponent(path)
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw APIError.badResponse }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw APIError.decoding }
    }

    // MARK: - Photos
    struct PhotoListResponse: Codable { let items: [Photo] }
    func fetchPhotos() async -> [Photo] {
        do {
            let r: PhotoListResponse = try await get("/api/photos")
            return r.items
        } catch {
            return []
        }
    }

    // MARK: - Banners
    struct BannerListResponse: Codable { let items: [Banner] }
    func fetchBanners(locale: String = "fr") async -> [Banner] {
        do {
            let r: BannerListResponse = try await get("/api/banners?locale=\(locale)")
            return r.items
        } catch {
            return []
        }
    }

    // MARK: - Verse
    func fetchVerseOfTheDay() async -> Verse? {
        do {
            let v: Verse = try await get("/api/verse-of-the-day")
            return v
        } catch {
            return Verse(text: "Aimez-vous les uns les autres comme je vous ai aimés.", reference: "Jean 13:34")
        }
    }

    // MARK: - Chat
    struct ChatResponse: Codable { let text: String }
    func chat(question: String, history: [ChatMessage]) async -> String {
        let turns = history.map { ChatTurn(role: $0.role == .user ? "user" : "model", text: $0.text) }
        let body: [String: Any] = [
            "question": question,
            "history": turns.map { ["role": $0.role, "text": $0.text] }
        ]
        do {
            let r: ChatResponse = try await post("/api/ai/chat", body: body)
            return r.text
        } catch {
            return "Désolé, je n'ai pas pu répondre. Réessaie dans un instant."
        }
    }

    // MARK: - Newsletter
    struct OK: Codable { let ok: Bool? }
    func subscribeNewsletter(email: String) async -> Bool {
        do {
            let _: OK = try await post("/api/newsletter/subscribe", body: ["email": email])
            return true
        } catch { return false }
    }

    // MARK: - Upload photo
    func uploadPhoto(image: UIImage, lat: Double?, lon: Double?, placeName: String?) async -> Bool {
        guard let data = image.jpegData(compressionQuality: 0.85) else { return false }
        let url = baseURL.appendingPathComponent("/api/upload")
        let boundary = "Boundary-\(UUID().uuidString)"
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.addValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        func add(_ str: String) { body.append(str.data(using: .utf8)!) }
        add("--\(boundary)\r\n")
        add("Content-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\n")
        add("Content-Type: image/jpeg\r\n\r\n")
        body.append(data)
        add("\r\n")
        if let lat = lat { add("--\(boundary)\r\nContent-Disposition: form-data; name=\"lat\"\r\n\r\n\(lat)\r\n") }
        if let lon = lon { add("--\(boundary)\r\nContent-Disposition: form-data; name=\"lon\"\r\n\r\n\(lon)\r\n") }
        if let p = placeName, !p.isEmpty { add("--\(boundary)\r\nContent-Disposition: form-data; name=\"place\"\r\n\r\n\(p)\r\n") }
        add("--\(boundary)--\r\n")

        do {
            let (_, resp) = try await URLSession.shared.upload(for: req, from: body)
            guard let http = resp as? HTTPURLResponse else { return false }
            return (200..<300).contains(http.statusCode)
        } catch {
            return false
        }
    }
}
