'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ShoppingBag, MapPin, ArrowRight } from 'lucide-react';

type MenuData = {
  products: any[];
  productsByCategory: Record<string, any[]>;
  photoTypes: { type: string; count: number }[];
  countries: { country: string; count: number }[];
};

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  CHURCH:       { label: 'Églises',        icon: '⛪', color: '#FF2BB1' },
  MOSQUE:       { label: 'Mosquées',       icon: '🕌', color: '#22D3EE' },
  SYNAGOGUE:    { label: 'Synagogues',     icon: '✡️', color: '#FBBF24' },
  TEMPLE:       { label: 'Temples',        icon: '🛕', color: '#34D399' },
  PUBLIC_SPACE: { label: 'Espaces publics',icon: '🌆', color: '#8B5CF6' },
  OTHER:        { label: 'Autres lieux',   icon: '📍', color: '#94A3B8' }
};

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function MegaMenuTrigger({ label, type, locale }: { label: string; type: 'shop' | 'gallery'; locale: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MenuData | null>(null);

  useEffect(() => {
    if (open && !data) {
      fetch('/api/menu-data').then((r) => r.json()).then(setData).catch(() => {});
    }
  }, [open, data]);

  const localePrefix = locale !== 'fr' ? `/${locale}` : '';

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        href={`${localePrefix}/${type === 'shop' ? 'boutique' : 'galerie'}`}
        className="pill-nav-link inline-flex items-center gap-1"
      >
        {label}
        <ChevronDown size={12} />
      </Link>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-[100] min-w-[640px]">
          <div className="bg-zinc-950/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {type === 'shop' ? <ShopMenu data={data} prefix={localePrefix} /> : <GalleryMenu data={data} prefix={localePrefix} />}
          </div>
        </div>
      )}
    </div>
  );
}

function ShopMenu({ data, prefix }: { data: MenuData | null; prefix: string }) {
  if (!data) return <Loading />;
  const cats = Object.entries(data.productsByCategory);
  return (
    <div className="grid grid-cols-3 gap-0">
      {/* Catégories à gauche */}
      <div className="bg-zinc-900/50 p-5 border-r border-white/5">
        <p className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3 flex items-center gap-2">
          <ShoppingBag size={12} /> Catégories
        </p>
        <ul className="space-y-1">
          {cats.length === 0 ? <li className="text-xs text-white/40 italic">Aucun produit</li> :
            cats.map(([cat, list]) => (
              <li key={cat}>
                <Link href={`${prefix}/boutique?cat=${encodeURIComponent(cat)}`}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 text-sm text-white/85 hover:text-brand-pink transition">
                  <span>{cat}</span>
                  <span className="text-xs text-white/40">{list.length}</span>
                </Link>
              </li>
            ))}
        </ul>
        <Link href={`${prefix}/boutique`}
              className="mt-4 inline-flex items-center gap-1 text-xs text-brand-pink hover:underline font-bold">
          Voir tous les produits <ArrowRight size={12} />
        </Link>
      </div>

      {/* Produits récents à droite */}
      <div className="col-span-2 p-5">
        <p className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3">Nouveautés</p>
        <div className="grid grid-cols-3 gap-3">
          {data.products.slice(0, 6).map((p) => (
            <Link key={p.id} href={`${prefix}/boutique/${p.slug}`}
                  className="group block rounded-xl overflow-hidden bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-pink/40 transition">
              <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : <div className="w-full h-full flex items-center justify-center text-white/20"><ShoppingBag size={24} /></div>}
              </div>
              <div className="p-2">
                <p className="text-xs font-bold text-white group-hover:text-brand-pink truncate">{p.title}</p>
                <p className="text-xs font-bold text-brand-pink mt-0.5">{fmt(p.priceCents)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function GalleryMenu({ data, prefix }: { data: MenuData | null; prefix: string }) {
  if (!data) return <Loading />;
  return (
    <div className="grid grid-cols-2 gap-0">
      {/* Par type */}
      <div className="p-5 border-r border-white/5">
        <p className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3 flex items-center gap-2">
          <MapPin size={12} /> Par type de lieu
        </p>
        <ul className="space-y-1">
          {data.photoTypes.length === 0 ? <li className="text-xs text-white/40 italic">Aucune photo</li> :
            data.photoTypes.map((t) => {
              const meta = TYPE_LABELS[t.type] || TYPE_LABELS.OTHER;
              return (
                <li key={t.type}>
                  <Link href={`${prefix}/galerie?type=${t.type}`}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 text-sm text-white/85 hover:text-brand-pink transition">
                    <span className="flex items-center gap-2">
                      <span style={{ color: meta.color }}>{meta.icon}</span> {meta.label}
                    </span>
                    <span className="text-xs text-white/40">{t.count}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
        <Link href={`${prefix}/galerie`} className="mt-4 inline-flex items-center gap-1 text-xs text-brand-pink hover:underline font-bold">
          Toute la galerie <ArrowRight size={12} />
        </Link>
      </div>

      {/* Par pays */}
      <div className="p-5">
        <p className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3">🌍 Par pays</p>
        <ul className="space-y-1">
          {data.countries.length === 0 ? <li className="text-xs text-white/40 italic">Pas encore de données</li> :
            data.countries.map((c) => (
              <li key={c.country}>
                <Link href={`${prefix}/galerie?country=${encodeURIComponent(c.country)}`}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5 text-sm text-white/85 hover:text-brand-pink transition">
                  <span>{c.country}</span>
                  <span className="text-xs text-white/40">{c.count}</span>
                </Link>
              </li>
            ))}
        </ul>
        <Link href={`${prefix}/carte`} className="mt-4 inline-flex items-center gap-1 text-xs text-brand-pink hover:underline font-bold">
          Voir la carte mondiale <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function Loading() {
  return <div className="p-8 text-center text-white/40 text-sm">Chargement…</div>;
}
