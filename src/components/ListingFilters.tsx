'use client';
/**
 * ListingFilters — sidebar de filtres pour /fr/category/* et /fr/region/*
 *
 * Filtres : ville, code postal (préfixe), tag, "ouvert maintenant" (parse Listing.hours)
 * State entièrement côté client — pas de reload page, filtre les cards via querySelectorAll.
 */
import { useMemo, useState, useEffect } from 'react';
import { Filter, X, Search, MapPin, Tag as TagIcon, Clock } from 'lucide-react';

export interface ListingForFilter {
  id: string;
  name: string;
  city: string | null;
  postal_code: string | null;
  tags: string[];        // slugs ou noms
  hours: any | null;     // Json schedule
}

interface Props {
  listings: ListingForFilter[];
  onFilterChange: (visibleIds: Set<string>) => void;
  totalCount: number;
}

function isOpenNow(hours: any | null): boolean {
  if (!hours || typeof hours !== 'object') return true; // si pas d'horaires connus, on assume ouvert
  try {
    const now = new Date();
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = days[now.getDay()];
    const todaySchedule = hours[day] || hours[day.charAt(0).toUpperCase() + day.slice(1)] || hours[now.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase()];
    if (!todaySchedule || typeof todaySchedule !== 'string') return true; // tolérant
    if (/ferm[éeè]/i.test(todaySchedule) || /closed/i.test(todaySchedule)) return false;
    const match = todaySchedule.match(/(\d{1,2})[h:](\d{0,2}).*?(\d{1,2})[h:](\d{0,2})/);
    if (!match) return true;
    const open = parseInt(match[1]) * 60 + parseInt(match[2] || '0');
    const close = parseInt(match[3]) * 60 + parseInt(match[4] || '0');
    const curr = now.getHours() * 60 + now.getMinutes();
    if (close > open) return curr >= open && curr < close;
    // Cas "20h-3h" (overnight)
    return curr >= open || curr < close;
  } catch {
    return true;
  }
}

export function ListingFilters({ listings, onFilterChange, totalCount }: Props) {
  const [city, setCity] = useState('');
  const [cp, setCp] = useState('');
  const [tag, setTag] = useState('');
  const [search, setSearch] = useState('');
  const [openNow, setOpenNow] = useState(false);

  // Calcul des facettes (uniques + count)
  const cities = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of listings) {
      if (l.city) map.set(l.city, (map.get(l.city) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);
  }, [listings]);

  const tags = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of listings) for (const t of l.tags || []) map.set(t, (map.get(t) || 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
  }, [listings]);

  // Apply filter
  useEffect(() => {
    const out = new Set<string>();
    const cpLow = cp.trim();
    const searchLow = search.trim().toLowerCase();
    for (const l of listings) {
      if (city && l.city !== city) continue;
      if (cpLow && !(l.postal_code || '').startsWith(cpLow)) continue;
      if (tag && !l.tags?.includes(tag)) continue;
      if (openNow && !isOpenNow(l.hours)) continue;
      if (searchLow && !l.name.toLowerCase().includes(searchLow)) continue;
      out.add(l.id);
    }
    onFilterChange(out);
  }, [city, cp, tag, search, openNow, listings, onFilterChange]);

  const visibleCount = listings.filter((l) => {
    if (city && l.city !== city) return false;
    if (cp.trim() && !(l.postal_code || '').startsWith(cp.trim())) return false;
    if (tag && !l.tags?.includes(tag)) return false;
    if (openNow && !isOpenNow(l.hours)) return false;
    if (search.trim() && !l.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  }).length;

  const activeFilters = [city, cp, tag, search, openNow ? 'open' : ''].filter(Boolean).length;

  function clearAll() {
    setCity(''); setCp(''); setTag(''); setSearch(''); setOpenNow(false);
  }

  return (
    <aside className="sticky top-24 self-start space-y-4 text-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold flex items-center gap-2 text-white">
          <Filter size={14} /> Filtres
          {activeFilters > 0 && <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeFilters}</span>}
        </h3>
        {activeFilters > 0 && (
          <button onClick={clearAll} className="text-xs text-zinc-400 hover:text-pink-300 transition flex items-center gap-1">
            <X size={11} /> Reset
          </button>
        )}
      </div>

      <div className="text-xs text-zinc-400 mb-3">
        <strong className="text-white">{visibleCount}</strong> sur {totalCount} lieu{totalCount > 1 ? 'x' : ''}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom du lieu…"
          className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm placeholder:text-zinc-500 focus:border-pink-500/50 focus:outline-none"
        />
      </div>

      {/* Open now toggle */}
      <button
        onClick={() => setOpenNow(!openNow)}
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
          openNow
            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
            : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/30 text-zinc-300'
        }`}
      >
        <span className="flex items-center gap-2">
          <Clock size={14} /> Ouvert maintenant
        </span>
        <span className={`w-4 h-4 rounded-full ${openNow ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
      </button>

      {/* CP préfixe */}
      <div>
        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1 mb-1">
          <MapPin size={10} /> Code postal
        </label>
        <input
          type="text"
          value={cp}
          onChange={(e) => setCp(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
          placeholder="Ex: 75 (préfixe)"
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm placeholder:text-zinc-500 focus:border-pink-500/50 focus:outline-none"
        />
      </div>

      {/* Ville (top 50) */}
      {cities.length > 0 && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1.5 block">Ville</label>
          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            <button
              onClick={() => setCity('')}
              className={`w-full text-left px-2 py-1 rounded text-xs transition ${city === '' ? 'bg-pink-500/20 text-pink-300' : 'hover:bg-white/5 text-zinc-300'}`}
            >
              Toutes ({listings.length})
            </button>
            {cities.map(([c, n]) => (
              <button
                key={c}
                onClick={() => setCity(c === city ? '' : c)}
                className={`w-full text-left px-2 py-1 rounded text-xs transition flex justify-between ${city === c ? 'bg-pink-500/20 text-pink-300' : 'hover:bg-white/5 text-zinc-300'}`}
              >
                <span className="truncate">{c}</span>
                <span className="text-zinc-500 text-[10px]">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div>
          <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1 mb-1.5">
            <TagIcon size={10} /> Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(([t, n]) => (
              <button
                key={t}
                onClick={() => setTag(t === tag ? '' : t)}
                className={`text-[10px] px-2 py-1 rounded-full transition ${
                  tag === t
                    ? 'bg-violet-500/30 text-violet-200 border border-violet-500/50'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-transparent'
                }`}
              >
                {t} <span className="opacity-60">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * Wrapper qui filtre les cards rendues côté serveur via data-listing-id.
 * Utilisé sur les pages /fr/category/* et /fr/region/* qui passent les listings au component.
 */
export function FilterableListingGrid({ listings, renderCard }: {
  listings: ListingForFilter[];
  renderCard: (l: ListingForFilter) => React.ReactNode;
}) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(listings.map((l) => l.id)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ListingFilters listings={listings} onFilterChange={setVisibleIds} totalCount={listings.length} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {listings
          .filter((l) => visibleIds.has(l.id))
          .map((l) => renderCard(l))}
      </div>
    </div>
  );
}
