import SwiftUI
import PhotosUI
import CoreLocation

struct CaptureView: View {
    @State private var selectedItem: PhotosPickerItem?
    @State private var image: UIImage?
    @State private var placeName = ""
    @State private var sending = false
    @State private var sent = false
    @State private var failed = false
    @StateObject private var location = LocationManager()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    if let image {
                        Image(uiImage: image)
                            .resizable().scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .padding()
                        VStack(spacing: 12) {
                            TextField("Nom du lieu (ex: Cathédrale Notre-Dame)", text: $placeName)
                                .padding(14)
                                .background(.white.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .foregroundColor(.white)
                            if let coord = location.coordinate {
                                Label("Position : \(String(format: "%.4f", coord.latitude)), \(String(format: "%.4f", coord.longitude))", systemImage: "location.fill")
                                    .font(.caption).foregroundColor(.neonCyan)
                            }
                            HStack(spacing: 12) {
                                Button {
                                    self.image = nil; self.selectedItem = nil; self.sent = false; self.failed = false
                                } label: {
                                    Text("Annuler").frame(maxWidth: .infinity).padding(.vertical, 14)
                                        .background(.white.opacity(0.08))
                                        .foregroundColor(.white).clipShape(Capsule())
                                }
                                Button { Task { await send() } } label: {
                                    HStack {
                                        if sending { ProgressView().tint(.white) }
                                        Text(sending ? "Envoi…" : "Envoyer").bold()
                                    }
                                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                                    .background(LinearGradient(colors: [.neonPink, .neonViolet], startPoint: .leading, endPoint: .trailing))
                                    .foregroundColor(.white).clipShape(Capsule())
                                }
                                .disabled(sending)
                            }
                        }
                        .padding(.horizontal)

                        if sent {
                            Label("Photo envoyée !", systemImage: "checkmark.seal.fill")
                                .foregroundColor(.green).padding()
                        }
                        if failed {
                            Label("Échec de l'envoi.", systemImage: "xmark.octagon.fill")
                                .foregroundColor(.red).padding()
                        }
                    } else {
                        VStack(spacing: 20) {
                            Image(systemName: "camera.viewfinder")
                                .font(.system(size: 80)).foregroundColor(.neonPink)
                                .padding(.top, 60)
                            Text("Capturez un lieu d'amour")
                                .font(.title2.bold()).foregroundColor(.white)
                            Text("Église, mosquée, synagogue, temple… partagez la beauté de la diversité.")
                                .font(.subheadline).multilineTextAlignment(.center)
                                .foregroundColor(.white.opacity(0.7))
                                .padding(.horizontal, 40)
                            PhotosPicker(selection: $selectedItem, matching: .images) {
                                Label("Choisir une photo", systemImage: "photo.on.rectangle")
                                    .font(.headline)
                                    .padding(.horizontal, 30).padding(.vertical, 14)
                                    .background(LinearGradient(colors: [.neonPink, .neonViolet], startPoint: .leading, endPoint: .trailing))
                                    .foregroundColor(.white).clipShape(Capsule())
                            }
                            .onChange(of: selectedItem) { newItem in
                                Task {
                                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                                       let img = UIImage(data: data) {
                                        image = img
                                        location.request()
                                    }
                                }
                            }
                        }
                    }
                }
                .padding(.bottom, 40)
            }
            .background(Color.brandDark.ignoresSafeArea())
            .navigationTitle("Capturer")
        }
    }

    func send() async {
        guard let image else { return }
        sending = true; failed = false; sent = false
        let ok = await APIService.shared.uploadPhoto(image: image,
                                                      lat: location.coordinate?.latitude,
                                                      lon: location.coordinate?.longitude,
                                                      placeName: placeName)
        sending = false
        if ok { sent = true; placeName = "" } else { failed = true }
    }
}

final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let mgr = CLLocationManager()
    @Published var coordinate: CLLocationCoordinate2D?

    override init() {
        super.init()
        mgr.delegate = self
        mgr.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }
    func request() {
        mgr.requestWhenInUseAuthorization()
        mgr.requestLocation()
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        coordinate = locations.last?.coordinate
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}
}
