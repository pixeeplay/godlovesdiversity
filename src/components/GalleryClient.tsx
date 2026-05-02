'use client';
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, X, ExternalLink } from 'lucide-react';
import { SharePhoto } from './SharePhoto';

const WorldMap = dynamic(() => import('./admin/WorldMap').then((m) => m.WorldMap), { ssr: false });

type Photo = {
  id: string;
  url: string;
  isDemo: boolean;
  caption: string | null;
  placeName: string | null;
  placeType: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  author: string | null;
};

const FILTERS = [
  { v: 'ALL', l: 'TOUT' },
  { v: 'CHURCH', l: 'ÉGLISES' },
  { v: 'MOSQUE', l: 'MOSQUÉES' },
  { v: 'SYNAGOGUE', l: 'SYNAGOGUES' },
  { v: 'TEMPLE', l: 'TEMPLES' }
];

export function GalleryClient({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<string>('ALL');
  const [active, setActive] = useState<Photo | null>(null);

  const filtered = useMemo(
    () => photos.filter((p) => filter === 'ALL' || p.placeType === filter),
    [photos, filter]
  );

  const markers = filtered
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      lat: p.latitude!,
      lon: p.longitude!,
      label: p.placeName || p.city || '',
      placeType: p.placeType || undefined,
      imageUrl: p.url
    }));

  return (
    <>
      {/* Filtres pills façon image 1 */}
      <div className="container-wide flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition
              ${filter === f.v
                ? 'bg-brand-pink text-white shadow-[0_0_20px_rgba(255,43,177,.5)]'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Layout 2 colonnes : MAP gauche + GRID droite */}
      <div className="container-wide grid lg:grid-cols-[420px,1fr] gap-6">
        {/* MAP */}
        <div className="stained-card p-3 lg:sticky lg:top-24 self-start">
          <WorldMap markers={markers} height={520} />
          <div className="mt-3 flex items-center justify-between text-xs text-white/60">
            <span>{markers.length} lieu{markers.length > 1 ? 'x' : ''} géolocalisé{markers.length > 1 ? 's' : ''}</span>
            <span>{filtered.length} photos</span>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[80vh] overflow-y-auto overflow-x-hidden pr-2"
             style={{ scrollbarWidth: 'thin', gridAutoRows: 'min-content' }}>
          {filtered.length === 0 && (
            <p className="text-white/50 col-span-full text-center py-20">Aucune photo pour ce filtre.</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p)}
              className="group block w-full rounded-xl border border-white/10 bg-white/5 hover:border-brand-pink transition overflow-hidden"
            >
              <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                {p.isDemo ? (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-pink/30 via-purple-700/20 to-blue-700/30 flex items-center justify-center">
                    <span className="text-4xl">❤️</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 text-[10px] text-left">
                  <div className="flex items-center gap-1 text-white/80 truncate">
                    <MapPin size={10} /> {p.city || p.country || '—'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MODAL plein écran sur clic */}
      {active && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white"
          >
            <X size={28} />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            {active.isDemo ? (
              <div className="aspect-video bg-gradient-to-br from-brand-pink/30 via-purple-700/20 to-blue-700/30 rounded-2xl flex items-center justify-center text-6xl">❤️</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.url} alt="" className="rounded-2xl w-full max-h-[75vh] object-contain" />
            )}
            <div className="mt-4 text-center">
              {active.placeName && <div className="font-bold text-lg">{active.placeName}</div>}
              <div className="text-white/70 flex items-center justify-center gap-1">
                <MapPin size={14} /> {active.city}{active.city && active.country ? ', ' : ''}{active.country}
              </div>
              {active.caption && (
                <p className="mt-3 italic text-white/80 max-w-xl mx-auto">"{active.caption}"</p>
              )}
              {active.author && (
                <p className="mt-2 text-xs text-white/40">— {active.author}</p>
              )}
              {/* Boutons partage + voir détail */}
              {!active.isDemo && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <SharePhoto
                    url={`${typeof window !== 'undefined' ? window.location.origin : ''}/photo/${active.id}`}
                    title={active.placeName || 'Photo — God Loves Diversity'}
                  />
                  <a href={`/photo/${active.id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold transition">
                    <ExternalLink size={14} /> Page complète + commentaires
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
