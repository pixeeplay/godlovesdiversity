'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Star, Globe, Phone, Filter, Search, Calendar, Tag, ExternalLink, Utensils, Wine, Coffee, Music, Hotel, ShoppingBag, Palette, Church, Sparkles, HeartHandshake, Heart, Users, Users2, Map as MapIcon, LayoutGrid } from 'lucide-react';
import { VenuesMap } from './VenuesMap';

const TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  RESTAURANT:       { label: 'Restaurants', icon: Utensils },
  BAR:              { label: 'Bars',        icon: Wine },
  CAFE:             { label: 'Cafés',       icon: Coffee },
  CLUB:             { label: 'Clubs',       icon: Music },
  HOTEL:            { label: 'Hôtels',      icon: Hotel },
  SHOP:             { label: 'Boutiques',   icon: ShoppingBag },
  CULTURAL:         { label: 'Culturel',    icon: Palette },
  CHURCH:           { label: 'Églises',     icon: Church },
  TEMPLE:           { label: 'Lieux de culte', icon: Church },
  COMMUNITY_CENTER: { label: 'Centres LGBT', icon: Users2 },
  HEALTH:           { label: 'Santé',       icon: HeartHandshake },
  ASSOCIATION:      { label: 'Associations', icon: Users },
  OTHER:            { label: 'Autres',      icon: Sparkles }
};

const RATING_BADGE: Record<string, { color: string; label: string; emoji: string }> = {
  RAINBOW:  { color: 'from-pink-500 via-violet-500 to-cyan-500', label: '100% LGBT', emoji: '🏳️‍🌈' },
  FRIENDLY: { color: 'from-emerald-500 to-cyan-500', label: 'Friendly', emoji: '✨' },
  NEUTRAL:  { color: 'from-zinc-500 to-zinc-600', label: 'Neutral', emoji: '⚪' },
  CAUTION:  { color: 'from-amber-500 to-red-500', label: 'À approfondir', emoji: '⚠️' }
};

export function VenuesDirectory({ initial }: { initial: any[] }) {
  const [venues] = useState<any[]>(initial);
  const [type, setType] = useState<string>('');
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');

  const cities = useMemo(() => Array.from(new Set(venues.map(v => v.city).filter(Boolean))).sort() as string[], [venues]);
  const countries = useMemo(() => Array.from(new Set(venues.map(v => v.country).filter(Boolean))).sort() as string[], [venues]);

  const filtered = useMemo(() => venues.filter(v => {
    if (type && v.type !== type) return false;
    if (country && v.country !== country) return false;
    if (city && v.city !== city) return false;
    if (q) {
      const ql = q.toLowerCase();
      if (!v.name?.toLowerCase().includes(ql) && !v.description?.toLowerCase().includes(ql) && !v.city?.toLowerCase().includes(ql)) return false;
    }
    return true;
  }), [venues, type, country, city, q]);

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
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-6 flex flex-wrap gap-2 items-center">
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un lieu, ville…" className="bg-transparent flex-1 px-1 py-1.5 text-xs outline-none" />
        </div>
        <span className="text-xs text-zinc-500 ml-auto pr-2">{filtered.length} résultat(s)</span>
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

      {/* CARTE INTERACTIVE */}
      {view === 'map' && (
        <section className="mb-6">
          <VenuesMap venues={filtered as any} />
        </section>
      )}

      {/* Grid des venues */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          Aucun lieu trouvé avec ces filtres.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => <VenueCard key={v.id} v={v} />)}
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-8 text-center">
        Tu connais un lieu safe à ajouter ? <Link href="/contact" className="text-pink-400 hover:underline">Contacte-nous</Link> · Tu es propriétaire ? Demande un compte gérant pour ajouter ton lieu et tes événements.
      </p>
    </main>
  );
}

function VenueCard({ v }: { v: any }) {
  const T = TYPE_LABELS[v.type] || TYPE_LABELS.OTHER;
  const Icon = T.icon;
  const rating = RATING_BADGE[v.rating] || RATING_BADGE.FRIENDLY;

  return (
    <Link href={`/lieux/${v.slug}`} className="block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-pink-500/40 transition group">
      <div className="aspect-[16/10] bg-zinc-950 relative overflow-hidden">
        {v.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={48} className="text-zinc-700" />
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
      </div>
    </Link>
  );
}
