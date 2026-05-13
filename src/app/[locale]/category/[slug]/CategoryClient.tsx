'use client';
import Link from 'next/link';
import { useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { ListingFilters, type ListingForFilter } from '@/components/ListingFilters';

type CategoryListing = ListingForFilter & {
  slug: string;
  subtitle_fr: string | null;
  cover_image: string | null;
};

export function CategoryClient({ listings, locale }: { listings: CategoryListing[]; locale: string }) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(listings.map((l) => l.id)));
  const visible = listings.filter((l) => visibleIds.has(l.id));

  const handleChange = useCallback((ids: Set<string>) => setVisibleIds(ids), []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      <ListingFilters listings={listings} onFilterChange={handleChange} totalCount={listings.length} />
      <div>
        {visible.length === 0 ? (
          <div className="text-center py-16 opacity-60">
            <MapPin size={32} className="mx-auto mb-2 opacity-40" />
            Aucun résultat avec ces filtres.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map((l) => (
              <Link
                key={l.id}
                href={`/${locale}/listing/${l.slug}` as any}
                className="rounded-2xl border border-white/10 hover:border-pink-500/50 bg-white/5 overflow-hidden transition group"
              >
                {l.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.cover_image} alt={l.name} className="w-full h-44 object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-cyan-500/10 flex items-center justify-center">
                    <MapPin size={32} className="text-pink-400/60" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-bold mb-1 text-white group-hover:text-pink-300 transition">{l.name}</h3>
                  {l.subtitle_fr && <p className="text-sm text-white/60 line-clamp-2">{l.subtitle_fr}</p>}
                  <p className="text-xs text-white/40 mt-2 flex items-center gap-1">
                    <MapPin size={11} /> {l.city || 'France'}{l.postal_code ? ` · ${l.postal_code}` : ''}
                  </p>
                  {l.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
