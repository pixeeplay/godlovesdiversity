'use client';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, ShieldCheck, AlertTriangle, ShieldAlert, Heart, Filter, Map as MapIcon } from 'lucide-react';
import { listAllCountries, getCountryHelp } from '@/lib/lgbt-helplines';

// Leaflet doit être chargé client-only
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const Marker       = dynamic(() => import('react-leaflet').then(m => m.Marker),       { ssr: false });
const Popup        = dynamic(() => import('react-leaflet').then(m => m.Popup),        { ssr: false });

const RISK_INFO: Record<string, { color: string; label: string; icon: any }> = {
  safe: { color: 'emerald', label: 'Cadre légal protecteur', icon: ShieldCheck },
  caution: { color: 'amber', label: 'Discrimination présente', icon: AlertTriangle },
  danger: { color: 'red', label: 'Législation hostile', icon: ShieldAlert },
  extreme: { color: 'red', label: 'Très restrictive', icon: ShieldAlert }
};

export function CountryMapClient({ venues, photos }: { venues: any[]; photos: any[] }) {
  const [showVenues, setShowVenues] = useState(true);
  const [showPhotos, setShowPhotos] = useState(true);
  const [venueType, setVenueType] = useState<string>('');

  const countries = useMemo(() => listAllCountries().map((code) => {
    const help = getCountryHelp(code);
    return { code, ...help! };
  }), []);

  const filteredVenues = useMemo(() =>
    venues.filter(v => !venueType || v.type === venueType)
  , [venues, venueType]);

  const safeCount = countries.filter(c => c.riskLevel === 'safe').length;
  const cautionCount = countries.filter(c => c.riskLevel === 'caution').length;
  const dangerCount = countries.filter(c => c.riskLevel === 'danger' || c.riskLevel === 'extreme').length;

  const venueTypes = useMemo(() => Array.from(new Set(venues.map(v => v.type))), [venues]);

  return (
    <main className="container-wide py-12">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl p-3">
            <MapIcon size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-4xl">Carte mondiale</h1>
        </div>
        <p className="text-zinc-400 max-w-3xl">
          Lieux LGBTQ+ géolocalisés · Photos de la communauté · Statut juridique par pays.
        </p>
      </header>

      {/* Stats globales */}
      <section className="grid grid-cols-3 gap-3 mb-4">
        <Stat icon={ShieldCheck} value={safeCount} label="Pays protecteurs" color="emerald" />
        <Stat icon={AlertTriangle} value={cautionCount} label="Vigilance" color="amber" />
        <Stat icon={ShieldAlert} value={dangerCount} label="Hostile" color="red" />
      </section>

      {/* Filtres carte */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center text-xs">
        <Filter size={12} className="text-zinc-500" />
        <button onClick={() => setShowVenues(!showVenues)} className={`px-2 py-1 rounded-full ${showVenues ? 'bg-pink-500/20 text-pink-300' : 'bg-zinc-800 text-zinc-400'}`}>
          📍 Lieux ({venues.length})
        </button>
        <button onClick={() => setShowPhotos(!showPhotos)} className={`px-2 py-1 rounded-full ${showPhotos ? 'bg-cyan-500/20 text-cyan-300' : 'bg-zinc-800 text-zinc-400'}`}>
          📸 Photos communauté ({photos.length})
        </button>
        {showVenues && venueTypes.length > 0 && (
          <select value={venueType} onChange={(e) => setVenueType(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs">
            <option value="">Tous types</option>
            {venueTypes.map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
      </section>

      {/* Carte Leaflet */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6" style={{ height: 500 }}>
        <MapContainer center={[46.8, 2.3]} zoom={4} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {showVenues && filteredVenues.map((v) => (
            <Marker key={v.id} position={[v.lat, v.lng]}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <strong>{v.name}</strong><br />
                  <small>{v.type} · {v.rating}</small><br />
                  {v.shortDescription && <div style={{ fontSize: 11, marginTop: 4 }}>{v.shortDescription}</div>}
                  <a href={`/lieux/${v.slug}`} style={{ color: '#ec4899', fontSize: 11, marginTop: 4, display: 'block' }}>Voir la fiche →</a>
                </div>
              </Popup>
            </Marker>
          ))}
          {showPhotos && photos.map((p) => (
            <Marker key={p.id} position={[p.latitude, p.longitude]}>
              <Popup>
                <div style={{ minWidth: 140 }}>
                  <strong>{p.placeName || 'Lieu de culte'}</strong><br />
                  <small>{p.city}, {p.country}</small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </section>

      {/* Liste des pays */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-cyan-400 mb-3">Statut LGBTQ+ par pays ({countries.length} référencés)</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {countries.map((c) => {
            const info = RISK_INFO[c.riskLevel];
            const Icon = info.icon;
            return (
              <div key={c.code} className={`rounded-2xl border p-4 bg-${info.color}-500/5 border-${info.color}-500/30`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white">{c.countryName}</div>
                    <div className="text-[10px] text-zinc-500">{c.code}</div>
                  </div>
                  <Icon size={16} className={`text-${info.color}-400`} />
                </div>
                <div className={`text-[11px] text-${info.color}-200`}>{info.label}</div>
                <div className="text-xs text-zinc-500 mt-2 pt-2 border-t border-white/10">
                  📞 {c.helplines.length} aide(s) locale(s)
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, value, label, color }: any) {
  return (
    <div className={`bg-${color}-500/5 border border-${color}-500/30 rounded-2xl p-3`}>
      <Icon size={16} className={`text-${color}-400 mb-1`} />
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-zinc-400">{label}</div>
    </div>
  );
}
