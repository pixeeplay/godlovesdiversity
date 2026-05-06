'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin, Phone, Mail, Globe, Calendar, Tag, ExternalLink, ArrowLeft,
  Instagram, Facebook, Star, Camera, Video, Info, Map as MapIcon,
  Heart, Share2, Clock, Sparkles, ChevronLeft, ChevronRight, Play, Image as ImgIcon
} from 'lucide-react';

// Leaflet (mini-map dans l'onglet Carte)
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

interface Props { venue: any }

const TABS = [
  { id: 'resume',  label: 'Résumé',     icon: Sparkles },
  { id: 'photos',  label: 'Photos',     icon: Camera   },
  { id: 'videos',  label: 'Vidéos',     icon: Video    },
  { id: 'events',  label: 'Événements', icon: Calendar },
  { id: 'infos',   label: 'Infos',      icon: Info     },
  { id: 'carte',   label: 'Carte',      icon: MapIcon  }
];

const RATING_META: Record<string, { label: string; emoji: string; gradient: string }> = {
  RAINBOW:  { label: '100% LGBT',     emoji: '🏳️‍🌈', gradient: 'from-fuchsia-500 to-violet-500' },
  FRIENDLY: { label: 'LGBT-friendly',  emoji: '✨',     gradient: 'from-violet-500 to-cyan-500' },
  NEUTRAL:  { label: 'Neutre',         emoji: '⚪',     gradient: 'from-zinc-500 to-zinc-600' },
  CAUTION:  { label: 'À vérifier',     emoji: '⚠️',     gradient: 'from-amber-500 to-orange-500' }
};

export function VenueProfile({ venue: v }: Props) {
  const [tab, setTab] = useState('resume');
  const [photoIdx, setPhotoIdx] = useState(0);
  const photoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const photos: string[] = (Array.isArray(v.photos) ? v.photos : []).filter(Boolean);
  if (v.coverImage && !photos.includes(v.coverImage)) photos.unshift(v.coverImage);
  const videos: string[] = (Array.isArray(v.videos) ? v.videos : []).filter(Boolean);
  const events = (v.events || []) as any[];
  const coupons = (v.coupons || []) as any[];
  const ratingMeta = RATING_META[v.rating] || RATING_META.FRIENDLY;
  const upcomingHints: any[] = Array.isArray(v.upcomingEventsHint) ? v.upcomingEventsHint : [];

  // Auto-cycle photos en mode résumé (mini-defile auto comme Insta stories)
  useEffect(() => {
    if (tab !== 'resume' || photos.length < 2) return;
    photoTimerRef.current = setInterval(() => {
      setPhotoIdx((i) => (i + 1) % photos.length);
    }, 4500);
    return () => { if (photoTimerRef.current) clearInterval(photoTimerRef.current); };
  }, [tab, photos.length]);

  // Inject leaflet css for the carte tab
  useEffect(() => {
    if (tab !== 'carte') return;
    if (document.querySelector('link[data-leaflet-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet-css', '1');
    document.head.appendChild(link);
  }, [tab]);

  function share() {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    if ((navigator as any).share) {
      (navigator as any).share({ title: v.name, text: v.shortDescription || v.description?.slice(0, 120), url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Lien copié !')).catch(() => {});
    }
  }

  function youtubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m?.[1] || null;
  }
  function vimeoId(url: string): string | null {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m?.[1] || null;
  }

  const tabsAvailable = TABS.filter((t) => {
    if (t.id === 'photos') return photos.length > 0;
    if (t.id === 'videos') return videos.length > 0;
    if (t.id === 'events') return events.length > 0 || upcomingHints.length > 0;
    if (t.id === 'carte') return v.lat && v.lng;
    return true;
  });

  return (
    <main className="bg-zinc-950 text-white min-h-screen pb-24">
      {/* HERO immersive avec photo + glassmorphism */}
      <section className="relative h-[60vh] min-h-[420px] max-h-[640px] overflow-hidden">
        {/* Cover photo défilante */}
        {photos.length > 0 ? (
          <div className="absolute inset-0">
            {photos.map((p, i) => (
              <img
                key={p + i}
                src={p}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === photoIdx ? 'opacity-100' : 'opacity-0'}`}
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ))}
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900 via-violet-900 to-cyan-900" />
        )}

        {/* Gradient overlay pour la lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/40 via-transparent to-transparent" />

        {/* Top bar : back + actions */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <Link
            href="/lieux"
            className="bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5"
          >
            <ArrowLeft size={12} /> Tous les lieux
          </Link>
          <div className="flex gap-2">
            <button
              onClick={share}
              className="bg-black/40 backdrop-blur-md border border-white/20 hover:bg-black/60 text-white p-2 rounded-full"
              title="Partager"
            >
              <Share2 size={14} />
            </button>
            {v.featured && (
              <span className="bg-amber-500/90 backdrop-blur text-black text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                <Star size={11} fill="currentColor" /> Coup de cœur
              </span>
            )}
            {v.enrichedAt && !v.featured && (
              <span className="bg-fuchsia-500/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} /> Vérifié IA
              </span>
            )}
          </div>
        </div>

        {/* Indicateur photos (Stories Instagram-style) */}
        {photos.length > 1 && tab === 'resume' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex gap-1 w-[80%] max-w-md">
            {photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${i === photoIdx ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        )}

        {/* Bottom : logo + nom + meta */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 md:px-8 pb-6">
          <div className="max-w-5xl mx-auto flex items-end gap-4">
            {/* Logo en cercle */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-zinc-900 border-2 border-white/30 shadow-2xl overflow-hidden flex items-center justify-center">
                {v.logo ? (
                  <img src={v.logo} alt={`Logo ${v.name}`} className="w-full h-full object-cover" />
                ) : (
                  <RainbowHeart size={64} />
                )}
              </div>
              {v.verified && (
                <div className="absolute -bottom-1 -right-1 bg-cyan-500 rounded-full p-1 border-2 border-zinc-950" title="Vérifié par GLD">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${ratingMeta.gradient} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2`}>
                <span>{ratingMeta.emoji}</span> {ratingMeta.label}
              </div>
              <h1 className="font-display font-bold text-3xl md:text-5xl leading-none drop-shadow-lg">{v.name}</h1>
              {(v.city || v.country) && (
                <div className="text-zinc-200 text-sm mt-2 flex items-center gap-1 drop-shadow">
                  <MapPin size={12} /> {[v.address, v.city, v.country].filter(Boolean).join(', ')}
                </div>
              )}
              {v.shortDescription && (
                <p className="text-zinc-300 text-sm mt-1 line-clamp-2 max-w-2xl drop-shadow">{v.shortDescription}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* TABS sticky (style iOS) */}
      <nav className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-2 md:px-4 overflow-x-auto">
          <div className="flex gap-1 py-2.5">
            {tabsAvailable.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3.5 md:px-4 py-2 rounded-full text-xs md:text-sm font-bold transition whitespace-nowrap ${
                    active
                      ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-lg shadow-fuchsia-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                  {t.id === 'photos' && photos.length > 0 && <span className={`text-[10px] ${active ? 'text-white/80' : 'text-zinc-500'}`}>{photos.length}</span>}
                  {t.id === 'videos' && videos.length > 0 && <span className={`text-[10px] ${active ? 'text-white/80' : 'text-zinc-500'}`}>{videos.length}</span>}
                  {t.id === 'events' && events.length > 0 && <span className={`text-[10px] ${active ? 'text-white/80' : 'text-zinc-500'}`}>{events.length}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        {/* — RÉSUMÉ — */}
        {tab === 'resume' && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-6">
              {/* Description */}
              {v.description && (
                <section>
                  <h2 className="text-[10px] uppercase font-bold tracking-widest text-fuchsia-300 mb-3 flex items-center gap-1.5">
                    <Sparkles size={10} /> À propos
                  </h2>
                  <div className="bg-zinc-900/60 backdrop-blur border border-zinc-800 rounded-2xl p-5">
                    <p className="text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap">{v.description}</p>
                  </div>
                </section>
              )}

              {/* Tags */}
              {v.tags?.length > 0 && (
                <section>
                  <h2 className="text-[10px] uppercase font-bold tracking-widest text-cyan-300 mb-2 flex items-center gap-1.5">
                    <Tag size={10} /> Caractéristiques
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {v.tags.map((t: string) => (
                      <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-200 border border-cyan-500/30">#{t}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Premiers events teaser */}
              {events.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] uppercase font-bold tracking-widest text-violet-300 flex items-center gap-1.5">
                      <Calendar size={10} /> Prochains événements ({events.length})
                    </h2>
                    {events.length > 2 && (
                      <button onClick={() => setTab('events')} className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1">
                        Tous <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {events.slice(0, 2).map((e) => <EventCard key={e.id} e={e} />)}
                  </div>
                </section>
              )}

              {/* Première vidéo en aperçu */}
              {videos.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[10px] uppercase font-bold tracking-widest text-rose-300 flex items-center gap-1.5">
                      <Video size={10} /> Vidéo
                    </h2>
                    {videos.length > 1 && (
                      <button onClick={() => setTab('videos')} className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1">
                        {videos.length - 1} de plus <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                  <VideoEmbed url={videos[0]} youtubeId={youtubeId} vimeoId={vimeoId} />
                </section>
              )}
            </div>

            <ContactSidebar v={v} coupons={coupons} />
          </div>
        )}

        {/* — PHOTOS — */}
        {tab === 'photos' && photos.length > 0 && (
          <PhotoGallery photos={photos} venueName={v.name} />
        )}

        {/* — VIDEOS — */}
        {tab === 'videos' && videos.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {videos.map((url, i) => (
              <VideoEmbed key={url + i} url={url} youtubeId={youtubeId} vimeoId={vimeoId} />
            ))}
          </div>
        )}

        {/* — EVENTS — */}
        {tab === 'events' && (
          <div className="space-y-6">
            {events.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-violet-300 mb-3">
                  Confirmés ({events.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {events.map((e) => <EventCard key={e.id} e={e} />)}
                </div>
              </section>
            )}
            {upcomingHints.length > 0 && (
              <section>
                <h2 className="text-[10px] uppercase font-bold tracking-widest text-amber-300 mb-3 flex items-center gap-1.5">
                  <Sparkles size={10} /> Détectés par IA (à confirmer)
                </h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {upcomingHints.map((h, i) => (
                    <article key={i} className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3">
                      <div className="font-bold text-amber-100 text-sm">{h.title}</div>
                      <div className="text-xs text-zinc-300 mt-1">{h.date}</div>
                      {h.source && <a href={h.source} target="_blank" rel="noopener noreferrer" className="text-amber-300 text-[11px] hover:underline inline-flex items-center gap-1 mt-2">Source <ExternalLink size={9} /></a>}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* — INFOS — */}
        {tab === 'infos' && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <div className="space-y-5">
              {/* Identité */}
              <InfoBlock title="Identité" icon={Info}>
                <Row label="Nom"     val={v.name} />
                <Row label="Type"    val={v.type} />
                <Row label="Note"    val={`${ratingMeta.emoji} ${ratingMeta.label}`} />
                {v.verified && <Row label="Vérifié" val="✓ par l'équipe GLD" />}
              </InfoBlock>

              {/* Adresse */}
              {(v.address || v.city || v.lat) && (
                <InfoBlock title="Adresse" icon={MapPin}>
                  {v.address && <Row label="Adresse" val={v.address} />}
                  {v.city && <Row label="Ville" val={v.city} />}
                  {v.postalCode && <Row label="Code postal" val={v.postalCode} />}
                  {v.region && <Row label="Région" val={v.region} />}
                  {v.country && <Row label="Pays" val={v.country} />}
                  {v.lat && v.lng && <Row label="GPS" val={`${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`} />}
                </InfoBlock>
              )}

              {/* Contact */}
              {(v.phone || v.email || v.website) && (
                <InfoBlock title="Contact" icon={Phone}>
                  {v.phone && <Row label="Téléphone" val={<a href={`tel:${v.phone}`} className="text-fuchsia-300 hover:underline">{v.phone}</a>} />}
                  {v.email && <Row label="Email" val={<a href={`mailto:${v.email}`} className="text-fuchsia-300 hover:underline">{v.email}</a>} />}
                  {v.website && <Row label="Site web" val={<a href={v.website} target="_blank" rel="noopener noreferrer" className="text-fuchsia-300 hover:underline inline-flex items-center gap-1">{v.website} <ExternalLink size={10} /></a>} />}
                  {v.bookingUrl && <Row label="Réservation" val={<a href={v.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline inline-flex items-center gap-1">Réserver <ExternalLink size={10} /></a>} />}
                </InfoBlock>
              )}

              {/* Réseaux */}
              {(v.instagram || v.facebook) && (
                <InfoBlock title="Réseaux sociaux" icon={Heart}>
                  {v.instagram && (
                    <Row
                      label="Instagram"
                      val={<a href={`https://instagram.com/${String(v.instagram).replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-300 hover:underline inline-flex items-center gap-1"><Instagram size={11} /> {v.instagram}</a>}
                    />
                  )}
                  {v.facebook && (
                    <Row
                      label="Facebook"
                      val={<a href={v.facebook} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline inline-flex items-center gap-1"><Facebook size={11} /> Page Facebook</a>}
                    />
                  )}
                </InfoBlock>
              )}

              {/* Horaires */}
              {v.openingHours && Object.keys(v.openingHours).length > 0 && (
                <InfoBlock title="Horaires d'ouverture" icon={Clock}>
                  <OpeningHours hours={v.openingHours} />
                </InfoBlock>
              )}
            </div>

            <ContactSidebar v={v} coupons={coupons} compact />
          </div>
        )}

        {/* — CARTE — */}
        {tab === 'carte' && v.lat && v.lng && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[60vh] min-h-[420px]">
              <MapContainer
                center={[v.lat, v.lng] as any}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; OpenStreetMap &copy; CARTO'
                />
                <Marker position={[v.lat, v.lng] as any}>
                  <Popup>
                    <div className="text-zinc-900">
                      <strong>{v.name}</strong><br />
                      {v.address || ''}{v.city ? `, ${v.city}` : ''}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-white font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2"
              >
                <MapIcon size={14} /> Itinéraire Google Maps
              </a>
              <a
                href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=17/${v.lat}/${v.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2"
              >
                <ExternalLink size={14} /> OpenStreetMap
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ----------- Sub-components ----------- */

function ContactSidebar({ v, coupons, compact }: any) {
  return (
    <aside className="space-y-3">
      {/* CTA principaux */}
      {(v.phone || v.bookingUrl || v.website) && (
        <section className="bg-gradient-to-br from-fuchsia-500/15 to-violet-500/15 border border-fuchsia-500/40 rounded-2xl p-4">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-fuchsia-200 mb-3">Contact rapide</h3>
          <div className="space-y-2">
            {v.bookingUrl && (
              <a href={v.bookingUrl} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 w-full">
                Réserver
              </a>
            )}
            {v.phone && (
              <a href={`tel:${v.phone}`} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 w-full">
                <Phone size={13} /> {v.phone}
              </a>
            )}
            {v.website && (
              <a href={v.website} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 w-full">
                <Globe size={13} /> Site web
              </a>
            )}
          </div>
        </section>
      )}

      {/* Coupons */}
      {coupons.length > 0 && !compact && (
        <section className="bg-gradient-to-br from-pink-500/15 to-violet-500/15 border-2 border-pink-500/50 rounded-2xl p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2 text-pink-200">
            <Tag size={14} /> Codes promo GLD
          </h3>
          <p className="text-[11px] text-zinc-300 mb-3">Présente ces codes en boutique :</p>
          <div className="space-y-2">
            {coupons.map((c: any) => (
              <div key={c.id} className="bg-zinc-950 border border-pink-500/30 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-pink-300 font-bold text-base font-mono">{c.code}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(c.code); }}
                    className="text-[10px] bg-pink-500/30 hover:bg-pink-500/60 text-pink-100 px-2 py-1 rounded"
                  >
                    Copier
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {c.description || `${c.discountValue}${c.discountKind === 'percent' ? '%' : ' centimes'} de réduction`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mini infos */}
      {!compact && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-400 space-y-1.5">
          {v.views != null && <div className="flex items-center gap-1.5"><span>👁</span> {v.views} vues</div>}
          {v.enrichedAt && (
            <div className="flex items-center gap-1.5 text-fuchsia-300">
              <Sparkles size={10} /> Fiche enrichie {new Date(v.enrichedAt).toLocaleDateString('fr-FR')}
            </div>
          )}
        </section>
      )}
    </aside>
  );
}

function PhotoGallery({ photos, venueName }: { photos: string[]; venueName: string }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((p, i) => (
          <button
            key={p + i}
            onClick={() => setActive(i)}
            className="aspect-square overflow-hidden rounded-xl bg-zinc-900 group relative"
          >
            <img src={p} alt={`${venueName} ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
              <ImgIcon size={20} className="text-white opacity-0 group-hover:opacity-100 transition" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {active != null && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <button
            onClick={(e) => { e.stopPropagation(); setActive((a) => Math.max(0, (a ?? 0) - 1)); }}
            disabled={active === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-30 p-3 rounded-full"
          >
            <ChevronLeft size={20} />
          </button>
          <img src={photos[active]} alt="" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
          <button
            onClick={(e) => { e.stopPropagation(); setActive((a) => Math.min(photos.length - 1, (a ?? 0) + 1)); }}
            disabled={active === photos.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 disabled:opacity-30 p-3 rounded-full"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full text-xs font-bold"
          >
            Fermer
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 px-3 py-1.5 rounded-full text-xs font-bold">
            {active + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}

function VideoEmbed({ url, youtubeId, vimeoId }: { url: string; youtubeId: (s: string) => string | null; vimeoId: (s: string) => string | null }) {
  const yt = youtubeId(url);
  const vi = vimeoId(url);
  if (yt) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${yt}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }
  if (vi) {
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vi}`}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block aspect-video rounded-2xl overflow-hidden bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300">
      <div className="flex items-center gap-2 text-sm">
        <Play size={16} /> Voir la vidéo <ExternalLink size={12} />
      </div>
    </a>
  );
}

function EventCard({ e }: { e: any }) {
  const start = new Date(e.startsAt);
  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-fuchsia-500/40 transition">
      <div className="flex items-start gap-3">
        <div className="bg-zinc-950 rounded-lg p-2 text-center min-w-[52px]">
          <div className="text-xl font-bold text-fuchsia-300 leading-none">{start.getDate()}</div>
          <div className="text-[10px] text-zinc-500 uppercase mt-0.5">{start.toLocaleDateString('fr-FR', { month: 'short' })}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white">{e.title}</h3>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {e.location && ` · ${e.location}`}
          </div>
          {e.description && <p className="text-xs text-zinc-300 mt-2 line-clamp-3">{e.description}</p>}
          {e.url && (
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 text-xs hover:underline inline-flex items-center gap-1 mt-2">
              Plus d'infos <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function InfoBlock({ title, icon: Icon, children }: any) {
  return (
    <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
      <header className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
        <Icon size={12} className="text-fuchsia-300" />
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-300">{title}</h3>
      </header>
      <div className="p-4 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, val }: any) {
  return (
    <div className="flex justify-between gap-3 text-xs py-1">
      <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">{label}</span>
      <span className="text-zinc-200 text-right">{val}</span>
    </div>
  );
}

function OpeningHours({ hours }: { hours: any }) {
  const days: Array<[string, string]> = [
    ['mon', 'Lun'], ['tue', 'Mar'], ['wed', 'Mer'], ['thu', 'Jeu'],
    ['fri', 'Ven'], ['sat', 'Sam'], ['sun', 'Dim']
  ];
  if (typeof hours === 'string') return <pre className="text-xs whitespace-pre-wrap font-sans text-zinc-200">{hours}</pre>;
  return (
    <div className="text-xs space-y-1">
      {days.map(([k, lbl]) => (
        <div key={k} className="flex justify-between">
          <span className="text-zinc-400 font-bold w-12">{lbl}</span>
          <span className="text-zinc-200">{hours[k] || hours[lbl] || '—'}</span>
        </div>
      ))}
    </div>
  );
}

function RainbowHeart({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vp-rb" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#e40303" />
          <stop offset="20%"  stopColor="#ff8c00" />
          <stop offset="40%"  stopColor="#ffed00" />
          <stop offset="60%"  stopColor="#008026" />
          <stop offset="80%"  stopColor="#004dff" />
          <stop offset="100%" stopColor="#750787" />
        </linearGradient>
      </defs>
      <path
        d="M50,30 C40,5 0,5 0,30 C0,50 50,90 50,90 C50,90 100,50 100,30 C100,5 60,5 50,30 Z"
        fill="url(#vp-rb)"
      />
    </svg>
  );
}
