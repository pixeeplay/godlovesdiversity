'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Calendar, Sparkles, Filter, Layers, Compass, Heart } from 'lucide-react';

// Leaflet en SSR-off (c'est exclusivement client)
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

const TYPE_EMOJI: Record<string, string> = {
  RESTAURANT: '🍽',
  BAR: '🍷',
  CAFE: '☕',
  CLUB: '🎵',
  HOTEL: '🏨',
  SHOP: '🛍',
  CULTURAL: '🎭',
  CHURCH: '⛪',
  TEMPLE: '🕌',
  COMMUNITY_CENTER: '🏳️‍🌈',
  HEALTH: '💚',
  ASSOCIATION: '🤝',
  OTHER: '✨'
};

const TYPE_COLORS: Record<string, string> = {
  RESTAURANT: '#ec4899',
  BAR: '#a855f7',
  CAFE: '#f59e0b',
  CLUB: '#7c3aed',
  HOTEL: '#06b6d4',
  SHOP: '#10b981',
  CULTURAL: '#f97316',
  CHURCH: '#6366f1',
  TEMPLE: '#3b82f6',
  COMMUNITY_CENTER: '#d946ef',
  HEALTH: '#22c55e',
  ASSOCIATION: '#eab308',
  OTHER: '#71717a'
};

interface Venue {
  id: string;
  slug: string;
  name: string;
  type: string;
  city?: string;
  country?: string;
  lat?: number | null;
  lng?: number | null;
  coverImage?: string | null;
  logo?: string | null;
  description?: string | null;
  rating?: string;
  events?: any[];
}

export function VenuesMap({ venues }: { venues: Venue[] }) {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [showOnlyWithEvents, setShowOnlyWithEvents] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tileLayer, setTileLayer] = useState<'osm' | 'dark' | 'satellite'>('dark');
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Charge l'icon Leaflet via CDN au boot
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  const located = useMemo(
    () => venues.filter((v) => typeof v.lat === 'number' && typeof v.lng === 'number'),
    [venues]
  );

  const filtered = useMemo(() => {
    return located.filter((v) => {
      if (activeTypes.size > 0 && !activeTypes.has(v.type)) return false;
      if (showOnlyWithEvents && (!v.events || v.events.length === 0)) return false;
      return true;
    });
  }, [located, activeTypes, showOnlyWithEvents]);

  const types = useMemo(() => Array.from(new Set(located.map((v) => v.type))), [located]);

  const center: [number, number] = useMemo(() => {
    if (filtered.length === 0) return [46.6, 2.5]; // Centre France
    const lats = filtered.map((v) => v.lat!).filter(Boolean);
    const lngs = filtered.map((v) => v.lng!).filter(Boolean);
    return [
      lats.reduce((s, v) => s + v, 0) / lats.length,
      lngs.reduce((s, v) => s + v, 0) / lngs.length
    ];
  }, [filtered]);

  const tileUrl =
    tileLayer === 'dark'
      ? 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
      : tileLayer === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    tileLayer === 'satellite'
      ? '© Esri'
      : tileLayer === 'dark'
      ? '© CartoDB · OpenStreetMap'
      : '© OpenStreetMap';

  function toggleType(t: string) {
    setActiveTypes((s) => {
      const ns = new Set(s);
      if (ns.has(t)) ns.delete(t);
      else ns.add(t);
      return ns;
    });
  }

  function locateMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => alert('Géolocalisation refusée')
    );
  }

  // Crée une icône Leaflet custom avec emoji + couleur du type
  function makeIcon(venue: Venue) {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');
    const emoji = TYPE_EMOJI[venue.type] || '📍';
    const color = TYPE_COLORS[venue.type] || '#71717a';
    const useImage = venue.logo || venue.coverImage;
    const html = useImage
      ? `<div style="position:relative;width:44px;height:54px;">
          <div style="width:42px;height:42px;border-radius:50%;border:3px solid ${color};background:url('${useImage}') center/cover;box-shadow:0 2px 8px rgba(0,0,0,0.6);"></div>
          <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};"></div>
        </div>`
      : `<div style="background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${emoji}</div>`;
    return L.divIcon({
      html,
      className: '',
      iconSize: useImage ? [44, 54] : [36, 36],
      iconAnchor: useImage ? [22, 54] : [18, 36]
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* HEADER MAP */}
      <div className="bg-gradient-to-r from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10 px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <MapPin size={16} className="text-fuchsia-300" />
          <span>Carte interactive · {filtered.length} lieux affichés</span>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button
            onClick={() => setTileLayer('dark')}
            className={`text-xs px-2 py-1 rounded ${tileLayer === 'dark' ? 'bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            title="Mode sombre"
          >🌙</button>
          <button
            onClick={() => setTileLayer('osm')}
            className={`text-xs px-2 py-1 rounded ${tileLayer === 'osm' ? 'bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            title="Plan classique"
          >🗺</button>
          <button
            onClick={() => setTileLayer('satellite')}
            className={`text-xs px-2 py-1 rounded ${tileLayer === 'satellite' ? 'bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            title="Vue satellite"
          >🛰</button>
          <button
            onClick={locateMe}
            className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 px-2 py-1 rounded flex items-center gap-1"
          >
            <Compass size={11} /> Me localiser
          </button>
          <button
            onClick={() => setShowOnlyWithEvents((v) => !v)}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${showOnlyWithEvents ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 hover:bg-zinc-700'}`}
          >
            <Calendar size={11} /> Évents
          </button>
        </div>
      </div>

      {/* FILTRES TYPES */}
      <div className="px-3 py-2 bg-zinc-900/70 border-b border-zinc-800 flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTypes(new Set())}
          className={`text-xs px-2 py-1 rounded ${activeTypes.size === 0 ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
        >Tous</button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${activeTypes.has(t) ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
            style={{ borderLeft: `3px solid ${TYPE_COLORS[t]}` }}
          >
            {TYPE_EMOJI[t]} {t.toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* MAP */}
      <div className="h-[600px] relative">
        <MapContainer
          center={center as any}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer url={tileUrl} attribution={tileAttribution} />
          {filtered.map((v) => (
            <Marker key={v.id} position={[v.lat!, v.lng!] as any} icon={makeIcon(v) as any}>
              <Popup>
                <div style={{ minWidth: 200 }}>
                  {(v.coverImage || v.logo) && (
                    <img
                      src={v.coverImage || v.logo!}
                      alt=""
                      style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                    />
                  )}
                  <h3 style={{ fontWeight: 800, marginBottom: 4 }}>{TYPE_EMOJI[v.type]} {v.name}</h3>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
                    {v.city} · {v.country}
                  </div>
                  {v.description && (
                    <p style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 6 }}>
                      {v.description.slice(0, 120)}{v.description.length > 120 ? '…' : ''}
                    </p>
                  )}
                  {v.events && v.events.length > 0 && (
                    <div style={{ background: '#fef3c7', padding: 6, borderRadius: 4, fontSize: 11, marginBottom: 6 }}>
                      <b>📅 Événement :</b> {v.events[0].title}
                    </div>
                  )}
                  <a
                    href={`/lieux/${v.slug}`}
                    style={{
                      display: 'inline-block',
                      background: 'linear-gradient(90deg, #d4537e, #7f77dd)',
                      color: 'white',
                      textDecoration: 'none',
                      padding: '6px 12px',
                      borderRadius: 99,
                      fontWeight: 700,
                      fontSize: 12
                    }}
                  >
                    Voir la fiche →
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
          {userPos && (
            <Marker position={userPos as any}>
              <Popup>📍 Vous êtes ici</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* LÉGENDE + 10 FONCTIONS IA PROPOSÉES */}
      <div className="px-4 py-3 bg-zinc-900/70 border-t border-zinc-800">
        <details>
          <summary className="text-xs text-zinc-400 cursor-pointer flex items-center gap-1.5 hover:text-white">
            <Sparkles size={12} className="text-fuchsia-300" />
            <span className="font-bold">10 fonctions IA proposées pour la carte</span>
          </summary>
          <div className="mt-3 grid sm:grid-cols-2 gap-2 text-[11px]">
            <AiFn n={1} title="🧭 Itinéraire safe" desc="L'IA calcule un trajet entre 2 points en privilégiant les zones avec lieux LGBT-friendly proches (alternative Google Maps, plus rassurant)" />
            <AiFn n={2} title="🌈 Pride Trip Planner" desc="Suggère un parcours touristique de N jours dans une ville, basé sur les venues + events Pride. Sortie ICS calendrier + itinéraire." />
            <AiFn n={3} title="📸 Photo overlay" desc="Sur clic d'un marker, Gemini Vision décrit la photo + identifie les drapeaux, ambiance ou particularités vues." />
            <AiFn n={4} title="🚨 Heatmap risque pays" desc="Superpose une couche de couleur selon les lois LGBT du pays survolé (criminalisation, mariage, adoption…) — alerte si pays risqué." />
            <AiFn n={5} title="🎯 Recommandations perso" desc="« Trouve-moi 5 lieux comme [X] dans un rayon de 10km » — embeddings sémantiques de description + tags." />
            <AiFn n={6} title="📅 Events autour de moi" desc="Calque temporel : slider date → ne montre que les venues avec events ce jour précis." />
            <AiFn n={7} title="🧙 Concierge vocal" desc="Bouton micro flottant : « Je veux dîner ce soir avec mon partenaire » → l'IA filtre la carte vocalement." />
            <AiFn n={8} title="🛡 Vérif fraîcheur" desc="Score de confiance par marker (cf. enrichment). Marker pâle si data > 90 jours, vif si récente." />
            <AiFn n={9} title="🏷 Auto-tags" desc="Gemini analyse photos + reviews et propose des tags émergents (« quiet », « dancing », « wheelchair-accessible ») non encore dans la base." />
            <AiFn n={10} title="🌍 Mode pèlerinage" desc="Sélectionne « Foi » → l'IA dessine sur la carte une route de pèlerinage inclusif passant par les lieux de culte LGBT-friendly d'Europe." />
          </div>
        </details>
      </div>
    </div>
  );
}

function AiFn({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-2.5">
      <div className="font-bold text-zinc-200 mb-1">
        <span className="text-fuchsia-400">#{n}.</span> {title}
      </div>
      <div className="text-[10px] text-zinc-400 leading-snug">{desc}</div>
    </div>
  );
}
