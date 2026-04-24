'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Marker = {
  id: string;
  lat: number;
  lon: number;
  label?: string;
  placeType?: string;
  imageUrl?: string;
};

const COLORS: Record<string, string> = {
  CHURCH: '#FF2BB1',
  MOSQUE: '#FF2BB1',
  SYNAGOGUE: '#FF2BB1',
  TEMPLE: '#FF2BB1',
  PUBLIC_SPACE: '#FF2BB1',
  OTHER: '#FF2BB1'
};
const LABEL: Record<string, string> = {
  CHURCH: '⛪ Église',
  MOSQUE: '🕌 Mosquée',
  SYNAGOGUE: '✡️ Synagogue',
  TEMPLE: '🛕 Temple',
  PUBLIC_SPACE: '🌆 Espace public',
  OTHER: '📍 Lieu'
};

function makeIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 22px; height: 22px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,.4);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export function WorldMap({ markers, height = 500 }: { markers: Marker[]; height?: number }) {
  useEffect(() => {
    // Fix pour les icônes Leaflet par défaut quand bundlé par Next
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
    });
  }, []);

  // Centre + zoom auto
  const center = markers.length
    ? [
        markers.reduce((s, m) => s + m.lat, 0) / markers.length,
        markers.reduce((s, m) => s + m.lon, 0) / markers.length
      ] as [number, number]
    : [20, 0] as [number, number];
  const zoom = markers.length === 1 ? 10 : markers.length > 1 ? 3 : 2;

  return (
    <div className="rounded-xl overflow-hidden border border-zinc-800" style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lon]}
            icon={makeIcon(COLORS[m.placeType || 'OTHER'] || COLORS.OTHER)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.imageUrl} alt="" style={{ width: '100%', borderRadius: 6, marginBottom: 6 }} />
                )}
                <div style={{ fontWeight: 600 }}>{m.label}</div>
                {m.placeType && <div style={{ fontSize: 11, color: '#888' }}>{LABEL[m.placeType]}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
