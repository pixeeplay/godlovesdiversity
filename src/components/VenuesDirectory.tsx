'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, Globe, Phone, Filter, Search, Calendar, Tag, ExternalLink, Utensils, Wine, Coffee, Music, Hotel, ShoppingBag, Palette, Church, Sparkles, HeartHandshake, Heart, Users, Users2, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { VenuesMap } from './VenuesMap';

const TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  RESTAURANT:        { label: 'Restaurants', icon: Utensils },
  BAR:               { label: 'Bars',        icon: Wine },
  CAFE:              { label: 'Cafés',       icon: Coffee },
  CLUB:              { label: 'Clubs',       icon: Music },
  HOTEL:             { label: 'Hôtels',      icon: Hotel },
  SHOP:              { label: 'Boutiques',   icon: ShoppingBag },
  CULTURAL:          { label: 'Culturel',    icon: Palette },
  CHURCH:            { label: 'Églises',     icon: Church },
  CHURCH_CATHOLIC:   { label: 'Catholique',  icon: Church },
  CHURCH_PROTESTANT: { label: 'Protestant',  icon: Church },
  CHURCH_ORTHODOX:   { label: 'Orthodoxe',   icon: Church },
  CHURCH_ANGLICAN:   { label: 'Anglican',    icon: Church },
  CHURCH_EVANGELICAL:{ label: 'Évangélique', icon: Church },
  MOSQUE:            { label: 'Mosquée',     icon: Church },
  SYNAGOGUE:         { label: 'Synagogue',   icon: Church },
  TEMPLE:            { label: 'Temple',      icon: Church },
  TEMPLE_BUDDHIST:   { label: 'Bouddhiste',  icon: Church },
  TEMPLE_HINDU:      { label: 'Hindou',      icon: Church },
  GURDWARA:          { label: 'Sikh',        icon: Church },
  MEDITATION_CENTER: { label: 'Méditation',  icon: Sparkles },
  COMMUNITY_CENTER:  { label: 'Centres LGBT', icon: Users2 },
  HEALTH:            { label: 'Santé',       icon: HeartHandshake },
  ASSOCIATION:       { label: 'Associations', icon: Users },
  OTHER:             { label: 'Autres',      icon: Sparkles }
};

/**
 * Groupes confessionnels pour le filtre "Par confession" sur /lieux.
 * Chaque groupe rassemble plusieurs VenueType.
 */
const FAITH_GROUPS: { id: string; label: string; emoji: string; types: string[] }[] = [
  { id: 'christian',  label: 'Christianisme', emoji: '✝️', types: ['CHURCH', 'CHURCH_CATHOLIC', 'CHURCH_PROTESTANT', 'CHURCH_ORTHODOX', 'CHURCH_ANGLICAN', 'CHURCH_EVANGELICAL'] },
  { id: 'muslim',     label: 'Islam',         emoji: '☪️', types: ['MOSQUE'] },
  { id: 'jewish',     label: 'Judaïsme',      emoji: '✡️', types: ['SYNAGOGUE'] },
  { id: 'buddhist',   label: 'Bouddhisme',    emoji: '☸️', types: ['TEMPLE_BUDDHIST', 'MEDITATION_CENTER'] },
  { id: 'hindu',      label: 'Hindouisme',    emoji: '🕉️', types: ['TEMPLE_HINDU'] },
  { id: 'sikh',       label: 'Sikhisme',      emoji: '☬',  types: ['GURDWARA'] },
];

const RATING_BADGE: Record<string, { color: string; label: string; emoji: string }> = {
  RAINBOW:  { color: 'from-pink-500 via-violet-500 to-cyan-500', label: '100% LGBT', emoji: '🏳️‍🌈' },
  FRIENDLY: { color: 'from-emerald-500 to-cyan-500', label: 'Friendly', emoji: '✨' },
  NEUTRAL:  { color: 'from-zinc-500 to-zinc-600', label: 'Neutral', emoji: '⚪' },
  CAUTION:  { color: 'from-amber-500 to-red-500', label: 'À approfondir', emoji: '⚠️' }
};

// Distance Haversine en km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function VenuesDirectory({ initial }: { initial: any[] }) {
  const [venues] = useState<any[]>(initial);
  const [type, setType] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'map'>('map');
  // Filtre par confession (groupe de types)
  const [faithGroup, setFaithGroup] = useState<string>('');

  // Distance mode : géoloc utilisateur + filtre "près de moi"
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null); // null = pas de filtre distance
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Route planner Waze-like : multi-sélection de venues (max 9 = limite Google Maps)
  const [selectedRoute, setSelectedRoute] = useState<string[]>([]); // venue IDs ordered
  const [routeMode, setRouteMode] = useState(false);

  function requestGeo() {
    if (!navigator.geolocation) { setGeoError('Géolocalisation non supportée'); return; }
    setGeoLoading(true); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
        if (maxDistanceKm == null) setMaxDistanceKm(50); // défaut 50 km
      },
      (err) => {
        setGeoError(err.message || 'Géolocalisation refusée');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }

  function toggleRouteSelect(id: string) {
    setSelectedRoute((prev) => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 9) { alert('Limite de 9 étapes (limitation Google Maps)'); return prev; }
      return [...prev, id];
    });
  }

  function clearRoute() { setSelectedRoute([]); }

  function openRouteInMaps() {
    const stops = selectedRoute
      .map(id => venues.find(v => v.id === id))
      .filter(v => v && v.lat && v.lng);
    if (stops.length < 2) { alert('Sélectionne au moins 2 étapes'); return; }
    // Format Google Maps : /dir/origin/waypoint1/waypoint2/.../destination
    const points = stops.map((s: any) => `${s.lat},${s.lng}`);
    const url = `https://www.google.com/maps/dir/${points.join('/')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function openRouteInWaze() {
    // Waze ne supporte qu'un seul destination param dans le deeplink → on prend le premier non-départ
    const stops = selectedRoute.map(id => venues.find(v => v.id === id)).filter(v => v && v.lat && v.lng);
    if (stops.length < 1) { alert('Sélectionne au moins 1 étape'); return; }
    const dest: any = stops[stops.length - 1];
    window.open(`https://waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes`, '_blank', 'noopener,noreferrer');
  }

  const cities = useMemo(() => Array.from(new Set(venues.map(v => v.city).filter(Boolean))).sort() as string[], [venues]);
  const countries = useMemo(() => Array.from(new Set(venues.map(v => v.country).filter(Boolean))).sort() as string[], [venues]);

  const filtered = useMemo(() => {
    const faithTypes = faithGroup ? FAITH_GROUPS.find(g => g.id === faithGroup)?.types || [] : [];
    let arr = venues.filter(v => {
      if (type && v.type !== type) return false;
      if (faithGroup && !faithTypes.includes(v.type)) return false;
      if (country && v.country !== country) return false;
      if (city && v.city !== city) return false;
      if (q) {
        const ql = q.toLowerCase();
        const tagsStr = Array.isArray(v.tags) ? v.tags.join(' ').toLowerCase() : '';
        const hit =
          v.name?.toLowerCase().includes(ql) ||
          v.description?.toLowerCase().includes(ql) ||
          v.shortDescription?.toLowerCase().includes(ql) ||
          v.city?.toLowerCase().includes(ql) ||
          v.country?.toLowerCase().includes(ql) ||
          v.address?.toLowerCase().includes(ql) ||
          tagsStr.includes(ql);
        if (!hit) return false;
      }
      // Filtre distance "près de moi"
      if (userLoc && maxDistanceKm != null) {
        if (v.lat == null || v.lng == null) return false;
        const dist = haversineKm(userLoc.lat, userLoc.lng, v.lat, v.lng);
        if (dist > maxDistanceKm) return false;
      }
      return true;
    });
    // Si distance active, trier par distance asc
    if (userLoc) {
      arr = arr
        .map(v => ({ ...v, _distanceKm: v.lat != null && v.lng != null ? haversineKm(userLoc.lat, userLoc.lng, v.lat, v.lng) : null }))
        .sort((a, b) => (a._distanceKm ?? 1e9) - (b._distanceKm ?? 1e9));
    }
    return arr;
  }, [venues, type, faithGroup, country, city, q, userLoc, maxDistanceKm]);

  const counts: Record<string, number> = {};
  for (const v of venues) counts[v.type] = (counts[v.type] || 0) + 1;

  return (
    <main className="container-wide py-12">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-pink-500 via-violet-500 to-cyan-500 rounded-xl p-3">
            <Heart size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl">Lieux LGBTQ+</h1>
        </div>
        <p className="text-zinc-400 max-w-3xl">
          Annuaire mondial des établissements 100% LGBT et LGBT-friendly · restaurants, bars, lieux de culte inclusifs, centres communautaires, hôtels, boutiques.
          Géolocalisés et notés par notre communauté.
        </p>
      </header>

      {/* Filtre confessionnel — pills couleurs par confession */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-3">
        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2 flex items-center gap-1.5">
          🕊 Filtrer par confession
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFaithGroup('')}
            className={`text-xs px-3 py-1.5 rounded-full font-bold transition ${
              !faithGroup ? 'bg-fuchsia-500 text-white shadow shadow-fuchsia-500/30' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            Toutes
          </button>
          {FAITH_GROUPS.map((g) => {
            const groupCount = venues.filter(v => g.types.includes(v.type)).length;
            const active = faithGroup === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setFaithGroup(active ? '' : g.id)}
                className={`text-xs px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
                  active ? 'bg-violet-500 text-white shadow shadow-violet-500/30' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
                disabled={groupCount === 0}
              >
                <span>{g.emoji}</span> {g.label} <span className={active ? 'text-white/80' : 'text-zinc-500'}>({groupCount})</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Catégories tuiles */}
      <section className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        <button onClick={() => setType('')} className={`p-3 rounded-xl border transition text-center ${!type ? 'bg-pink-500/20 border-pink-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
          <Sparkles size={20} className="mx-auto mb-1 text-pink-400" />
          <div className="text-[11px] font-bold">Tous</div>
          <div className="text-[10px] text-zinc-500">{venues.length}</div>
        </button>
        {Object.entries(TYPE_LABELS).slice(0, 12).map(([key, t]) => {
          if (!counts[key]) return null;
          const Icon = t.icon;
          const active = type === key;
          return (
            <button key={key} onClick={() => setType(active ? '' : key)} className={`p-3 rounded-xl border transition text-center ${active ? 'bg-pink-500/20 border-pink-500/40' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
              <Icon size={20} className="mx-auto mb-1 text-pink-400" />
              <div className="text-[11px] font-bold truncate">{t.label}</div>
              <div className="text-[10px] text-zinc-500">{counts[key]}</div>
            </button>
          );
        })}
      </section>

      {/* Filtres */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-3 flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-zinc-500 ml-1" />
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Pays (tous)</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs">
          <option value="">Ville (toutes)</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-zinc-950 border border-zinc-700 rounded-lg px-2">
          <Search size={12} className="text-zinc-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, ville, tag, description)…" className="bg-transparent flex-1 px-1 py-1.5 text-xs outline-none" />
          {q && (
            <button onClick={() => setQ('')} className="text-zinc-500 hover:text-white text-xs px-1">×</button>
          )}
        </div>
        <span className="text-xs text-zinc-500 ml-auto pr-2">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
        <div className="flex bg-zinc-950 border border-zinc-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 text-xs flex items-center gap-1 ${view === 'list' ? 'bg-fuchsia-500 text-white' : 'hover:bg-zinc-800'}`}
            title="Vue liste"
          >
            <LayoutGrid size={11} /> Liste
          </button>
          <button
            onClick={() => setView('map')}
            className={`px-3 py-1.5 text-xs flex items-center gap-1 ${view === 'map' ? 'bg-fuchsia-500 text-white' : 'hover:bg-zinc-800'}`}
            title="Vue carte"
          >
            <MapIcon size={11} /> Carte
          </button>
        </div>
      </section>

      {/* MODES SPÉCIAUX : Distance "près de moi" + Route planner Waze-like */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-6 flex flex-wrap items-center gap-2">
        {/* Distance */}
        {!userLoc ? (
          <button
            onClick={requestGeo}
            disabled={geoLoading}
            className="bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            {geoLoading ? '⏳' : '📍'} Près de moi
          </button>
        ) : (
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
            <span className="font-bold">📍 Près de moi :</span>
            <select
              value={maxDistanceKm ?? 50}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="bg-zinc-950 border border-emerald-500/30 rounded px-1.5 py-0.5 text-[11px]"
            >
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={500}>500 km</option>
              <option value={5000}>Monde entier</option>
            </select>
            <button
              onClick={() => { setUserLoc(null); setMaxDistanceKm(null); }}
              title="Désactiver"
              className="hover:text-white text-emerald-300/70"
            >×</button>
          </div>
        )}
        {geoError && <span className="text-[11px] text-rose-300">⚠ {geoError}</span>}

        <span className="text-zinc-700">·</span>

        {/* Route planner */}
        <button
          onClick={() => setRouteMode((r) => !r)}
          className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition ${
            routeMode
              ? 'bg-blue-500 border-blue-400 text-white'
              : 'bg-blue-500/15 hover:bg-blue-500/30 border-blue-500/40 text-blue-200'
          }`}
        >
          🚗 Route multi-étapes {selectedRoute.length > 0 && `(${selectedRoute.length})`}
        </button>

        {routeMode && (
          <span className="text-[11px] text-blue-200/80 italic">
            Clique sur les lieux pour les ajouter à ta route (max 9). Réordonner via × pour retirer.
          </span>
        )}
      </section>

      {/* Panel Route active : récap des étapes + boutons ouvrir Maps/Waze */}
      {routeMode && selectedRoute.length > 0 && (
        <section className="bg-blue-500/5 border-2 border-blue-500/40 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-bold text-blue-200 text-sm flex items-center gap-2">
              🚗 Mon itinéraire ({selectedRoute.length} étape{selectedRoute.length > 1 ? 's' : ''})
            </h3>
            <div className="flex gap-2 flex-wrap">
              <button onClick={clearRoute} className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full">
                Vider
              </button>
              <button
                onClick={openRouteInWaze}
                className="text-[11px] bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                Ouvrir dans Waze
              </button>
              <button
                onClick={openRouteInMaps}
                disabled={selectedRoute.length < 2}
                className="text-[11px] bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                Itinéraire Google Maps →
              </button>
            </div>
          </div>
          <ol className="space-y-1.5">
            {selectedRoute.map((id, i) => {
              const v = venues.find(x => x.id === id);
              if (!v) return null;
              return (
                <li key={id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
                  <span className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{v.name}</div>
                    <div className="text-[10px] text-zinc-500">
                      {[v.address, v.city, v.country].filter(Boolean).join(', ')}
                      {v.lat == null && <span className="text-amber-300 ml-2">⚠ pas géocodé</span>}
                    </div>
                  </div>
                  {i > 0 && (
                    <button
                      onClick={() => setSelectedRoute((p) => { const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; })}
                      title="Monter"
                      className="text-zinc-500 hover:text-white text-xs px-1"
                    >▲</button>
                  )}
                  {i < selectedRoute.length - 1 && (
                    <button
                      onClick={() => setSelectedRoute((p) => { const n = [...p]; [n[i+1], n[i]] = [n[i], n[i+1]]; return n; })}
                      title="Descendre"
                      className="text-zinc-500 hover:text-white text-xs px-1"
                    >▼</button>
                  )}
                  <button
                    onClick={() => toggleRouteSelect(id)}
                    title="Retirer"
                    className="text-rose-400 hover:text-rose-200 px-1.5 text-sm"
                  >×</button>
                </li>
              );
            })}
          </ol>
          <p className="text-[10px] text-blue-200/60 mt-2 italic">
            💡 Astuce : Google Maps optimise automatiquement le sens de la route. Pour Waze, on ouvre la dernière étape comme destination directe.
          </p>
        </section>
      )}

      {/* LAYOUT MODERNE : carte en premier + liste sidebar à droite (en mode 'map')
          OU grille classique en mode 'list' */}
      {view === 'map' ? (
        <section className="grid lg:grid-cols-[1fr_380px] gap-4 mb-6">
          {/* Carte (occupe la largeur principale) */}
          <div className="order-2 lg:order-1">
            <VenuesMap venues={filtered as any} />
          </div>
          {/* Sidebar liste : scrollable, 6-7 cartes visibles, sticky */}
          <aside className="order-1 lg:order-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-100px)]">
            <div className="px-4 py-3 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 border-b border-zinc-800">
              <div className="font-bold text-sm">Liste ({filtered.length})</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Clique pour ouvrir la fiche</div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Aucun lieu trouvé.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800 overflow-y-auto lg:max-h-[calc(100vh-180px)]">
                {filtered.slice(0, 100).map((v) => (
                  <VenueRow
                    key={v.id}
                    v={v}
                    distanceKm={v._distanceKm}
                    routeMode={routeMode}
                    isSelected={selectedRoute.includes(v.id)}
                    onToggleRoute={toggleRouteSelect}
                  />
                ))}
                {filtered.length > 100 && (
                  <div className="px-4 py-3 text-[11px] text-zinc-500 text-center">
                    + {filtered.length - 100} autres lieux (affine ta recherche pour voir les autres)
                  </div>
                )}
              </div>
            )}
          </aside>
        </section>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          Aucun lieu trouvé avec ces filtres.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VenueCard
              key={v.id}
              v={v}
              distanceKm={v._distanceKm}
              routeMode={routeMode}
              isSelected={selectedRoute.includes(v.id)}
              onToggleRoute={toggleRouteSelect}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-8 text-center">
        Tu connais un lieu safe à ajouter ? <Link href="/contact" className="text-pink-400 hover:underline">Contacte-nous</Link> · Tu es propriétaire ? Demande un compte gérant pour ajouter ton lieu et tes événements.
      </p>
    </main>
  );
}

function VenueCard({
  v,
  distanceKm,
  routeMode = false,
  isSelected = false,
  onToggleRoute
}: {
  v: any;
  distanceKm?: number | null;
  routeMode?: boolean;
  isSelected?: boolean;
  onToggleRoute?: (id: string) => void;
}) {
  const T = TYPE_LABELS[v.type] || TYPE_LABELS.OTHER;
  const Icon = T.icon;
  const rating = RATING_BADGE[v.rating] || RATING_BADGE.FRIENDLY;

  // En mode route → div clickable. Sinon → Link vers la fiche.
  const wrapperClass = routeMode
    ? `relative block bg-zinc-900 border-2 rounded-2xl overflow-hidden hover:border-blue-500/60 transition group cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-zinc-800'}`
    : 'relative block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-pink-500/40 transition group';

  const inner = (
    <>
      <div className="aspect-[16/10] bg-zinc-950 relative overflow-hidden">
        {v.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-500/10 via-violet-500/10 to-cyan-500/10">
            <GldLogoPlaceholder />
          </div>
        )}
        {/* Badge rating */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${rating.color}`}>
          {rating.emoji} {rating.label}
        </div>
        {v.featured && (
          <div className="absolute top-2 right-2 bg-amber-500 text-black px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Star size={10} /> Coup de cœur
          </div>
        )}
        {/* Badge fraîcheur si enrichi */}
        {v.enrichedAt && !v.featured && (
          <div className="absolute top-2 right-2 bg-fuchsia-500/90 backdrop-blur text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1" title={`Enrichi par IA · ${typeof v.freshnessScore === 'number' ? Math.round(v.freshnessScore) + '%' : ''}`}>
            ✨ {typeof v.freshnessScore === 'number' ? `${Math.round(v.freshnessScore)}%` : 'Enrichi'}
          </div>
        )}
        {/* Logo en avatar bottom-left (style profil Instagram) */}
        {v.logo && (
          <div className="absolute bottom-2 left-2 w-12 h-12 rounded-full bg-zinc-950 border-2 border-white/80 shadow-xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.logo} alt={`Logo ${v.name}`} className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-2 mb-1">
          <Icon size={14} className="text-pink-400 mt-1 shrink-0" />
          <h3 className="font-bold text-white flex-1 truncate">{v.name}</h3>
        </div>
        {(v.city || v.country) && (
          <div className="flex items-center gap-1 text-xs text-zinc-400">
            <MapPin size={11} /> {v.city}{v.city && v.country ? ', ' : ''}{v.country}
          </div>
        )}
        {v.shortDescription && (
          <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{v.shortDescription}</p>
        )}
        {v.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {v.tags.slice(0, 3).map((t: string) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-300">{t}</span>
            ))}
          </div>
        )}
        {v.events?.length > 0 && (
          <div className="text-[10px] text-violet-300 mt-2 flex items-center gap-1">
            <Calendar size={10} /> {v.events.length} événement(s) à venir
          </div>
        )}
        {distanceKm != null && (
          <div className="text-[10px] text-emerald-300 mt-1.5 flex items-center gap-1 font-bold">
            📍 {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`}
          </div>
        )}
      </div>
    </>
  );

  if (routeMode) {
    return (
      <div onClick={() => onToggleRoute?.(v.id)} className={wrapperClass}>
        <div className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-950/80 backdrop-blur text-zinc-400 border border-zinc-700'}`}>
          {isSelected ? '✓' : '+'}
        </div>
        {inner}
      </div>
    );
  }
  return <Link href={`/lieux/${v.slug}`} className={wrapperClass}>{inner}</Link>;
}

// ─────────────────────────────────────────────
// Logo GLD cœur arc-en-ciel (placeholder modernes)
// ─────────────────────────────────────────────
function GldLogoPlaceholder({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="opacity-60 group-hover:opacity-90 group-hover:scale-110 transition">
      <defs>
        <linearGradient id="rb-placeholder" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#e40303" />
          <stop offset="20%" stopColor="#ff8c00" />
          <stop offset="40%" stopColor="#ffed00" />
          <stop offset="60%" stopColor="#008026" />
          <stop offset="80%" stopColor="#004dff" />
          <stop offset="100%" stopColor="#750787" />
        </linearGradient>
      </defs>
      <path
        d="M50,30 C40,5 0,5 0,30 C0,50 50,90 50,90 C50,90 100,50 100,30 C100,5 60,5 50,30 Z"
        fill="url(#rb-placeholder)"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="2"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────
// VenueRow : ligne compacte pour la sidebar liste (à côté de la carte)
// ─────────────────────────────────────────────
function VenueRow({
  v,
  distanceKm,
  routeMode = false,
  isSelected = false,
  onToggleRoute
}: {
  v: any;
  distanceKm?: number | null;
  routeMode?: boolean;
  isSelected?: boolean;
  onToggleRoute?: (id: string) => void;
}) {
  const T = TYPE_LABELS[v.type] || TYPE_LABELS.OTHER;
  const Icon = T.icon;
  const rating = RATING_BADGE[v.rating] || RATING_BADGE.FRIENDLY;

  const inner = (
    <>
      <div className="w-14 h-14 rounded-lg bg-zinc-950 overflow-hidden flex-shrink-0 relative">
        {v.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-500/15 via-violet-500/15 to-cyan-500/15">
            <GldLogoPlaceholder size={32} />
          </div>
        )}
        {v.logo && v.coverImage && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-zinc-950 border border-white/70 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.logo} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Icon size={11} className="text-pink-400 flex-shrink-0" />
          <h3 className="font-bold text-sm truncate text-white group-hover:text-pink-200 transition">{v.name}</h3>
          {v.featured && <Star size={10} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <MapPin size={9} className="flex-shrink-0" />
          <span className="truncate">{v.city || '?'}{v.country ? `, ${v.country}` : ''}</span>
          {distanceKm != null && (
            <span className="ml-1 text-emerald-300 font-bold">
              · {distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)}km`}
            </span>
          )}
          {v.events && v.events.length > 0 && (
            <span className="ml-auto bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0">
              📅 {v.events.length}
            </span>
          )}
        </div>
      </div>
      {routeMode && (
        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isSelected ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
        }`}>
          {isSelected ? '✓' : '+'}
        </span>
      )}
    </>
  );

  const className = `flex items-center gap-3 px-3 py-2.5 transition group ${
    routeMode
      ? `cursor-pointer ${isSelected ? 'bg-blue-500/15 border-l-4 border-blue-500' : 'hover:bg-zinc-800/60'}`
      : 'hover:bg-zinc-800/60'
  }`;

  if (routeMode) {
    return <div onClick={() => onToggleRoute?.(v.id)} className={className}>{inner}</div>;
  }
  return <Link href={`/lieux/${v.slug}`} className={className}>{inner}</Link>;
}
