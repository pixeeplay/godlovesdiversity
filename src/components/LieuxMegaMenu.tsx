'use client';
/**
 * LieuxMegaMenu — dropdown riche pour l'onglet "Lieux" du Navbar.
 *
 * Affiche 3 colonnes : catégories × régions × top villes
 * Match la richesse visuelle de l'ancien WP parislgbt.com.
 *
 * Tout est statique (pas d'API call) — les 12 catégories, 13 régions, 25 villes
 * sont stables et connues à la build time.
 */
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin, Wine, Utensils, Coffee, Music, Hotel, ShoppingBag, Palette, HeartHandshake, Users, Sparkles, Map as MapIcon, ArrowRight } from 'lucide-react';

type Cat = { slug: string; label: string; icon: any; color: string };
type Region = { slug: string; label: string };
type City = { slug: string; label: string; region: string };

const CATEGORIES: Cat[] = [
  { slug: 'bars',          label: 'Bars',            icon: Wine,          color: '#FF2BB1' },
  { slug: 'restaurant',    label: 'Restaurants',     icon: Utensils,      color: '#EC4899' },
  { slug: 'clubs',         label: 'Clubs',           icon: Music,         color: '#A855F7' },
  { slug: 'cabarets',      label: 'Cabarets',        icon: Palette,       color: '#F97316' },
  { slug: 'saunas',        label: 'Saunas',          icon: Sparkles,      color: '#06B6D4' },
  { slug: 'cruising',      label: 'Cruising',        icon: Sparkles,      color: '#8B5CF6' },
  { slug: 'hebergement',   label: 'Hôtels',          icon: Hotel,         color: '#22D3EE' },
  { slug: 'boutiques',     label: 'Boutiques',       icon: ShoppingBag,   color: '#10B981' },
  { slug: 'sante',         label: 'Santé & PrEP',    icon: HeartHandshake,color: '#22C55E' },
  { slug: 'associations',  label: 'Associations',    icon: Users,         color: '#EAB308' },
  { slug: 'visites',       label: 'Visites & Tour.', icon: MapPin,        color: '#F59E0B' },
  { slug: 'cafe',          label: 'Cafés',           icon: Coffee,        color: '#FBBF24' }
];

const REGIONS: Region[] = [
  { slug: 'ile-de-france',                label: 'Île-de-France' },
  { slug: 'provence-alpes-cote-d-azur',   label: 'Provence-Alpes-Côte d\'Azur' },
  { slug: 'auvergne-rhone-alpes',         label: 'Auvergne-Rhône-Alpes' },
  { slug: 'occitanie',                    label: 'Occitanie' },
  { slug: 'nouvelle-aquitaine',           label: 'Nouvelle-Aquitaine' },
  { slug: 'grand-est',                    label: 'Grand Est' },
  { slug: 'hauts-de-france',              label: 'Hauts-de-France' },
  { slug: 'pays-de-la-loire',             label: 'Pays de la Loire' },
  { slug: 'bretagne',                     label: 'Bretagne' },
  { slug: 'normandie',                    label: 'Normandie' },
  { slug: 'centre-val-de-loire',          label: 'Centre-Val de Loire' },
  { slug: 'bourgogne-franche-comte',      label: 'Bourgogne-Franche-Comté' },
  { slug: 'corse',                        label: 'Corse' }
];

const TOP_CITIES: City[] = [
  { slug: 'paris',       label: 'Paris',       region: 'ile-de-france' },
  { slug: 'lyon',        label: 'Lyon',        region: 'auvergne-rhone-alpes' },
  { slug: 'marseille',   label: 'Marseille',   region: 'provence-alpes-cote-d-azur' },
  { slug: 'toulouse',    label: 'Toulouse',    region: 'occitanie' },
  { slug: 'nice',        label: 'Nice',        region: 'provence-alpes-cote-d-azur' },
  { slug: 'bordeaux',    label: 'Bordeaux',    region: 'nouvelle-aquitaine' },
  { slug: 'lille',       label: 'Lille',       region: 'hauts-de-france' },
  { slug: 'strasbourg',  label: 'Strasbourg',  region: 'grand-est' },
  { slug: 'montpellier', label: 'Montpellier', region: 'occitanie' },
  { slug: 'nantes',      label: 'Nantes',      region: 'pays-de-la-loire' },
  { slug: 'rennes',      label: 'Rennes',      region: 'bretagne' },
  { slug: 'grenoble',    label: 'Grenoble',    region: 'auvergne-rhone-alpes' }
];

export function LieuxMegaMenu({ locale = 'fr' }: { locale?: string }) {
  const [open, setOpen] = useState(false);
  const prefix = locale !== 'fr' ? `/${locale}` : '/fr';

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link href={`${prefix}/lieux` as any} className="pill-nav-link inline-flex items-center gap-1">
        Lieux
        <ChevronDown size={12} className={`transition ${open ? 'rotate-180' : ''}`} />
      </Link>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-[100] min-w-[800px]">
          <div
            className="rounded-2xl shadow-2xl overflow-hidden border border-white/15"
            style={{
              background: '#0a0a0f',
              boxShadow: '0 25px 80px -10px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)'
            }}
          >
            <div className="grid grid-cols-3 gap-0">
              {/* Colonne 1 : Catégories */}
              <div className="p-5 border-r border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-1">
                  <MapPin size={10} /> Par catégorie
                </div>
                <ul className="space-y-0.5 text-sm">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <li key={c.slug}>
                        <Link
                          href={`${prefix}/category/${c.slug}` as any}
                          className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition"
                        >
                          <span
                            className="w-6 h-6 rounded-md flex items-center justify-center transition-transform group-hover:scale-110"
                            style={{ background: `${c.color}22`, color: c.color }}
                          >
                            <Icon size={12} />
                          </span>
                          <span className="text-zinc-200 group-hover:text-white">{c.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Colonne 2 : Régions */}
              <div className="p-5 border-r border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-1">
                  <MapIcon size={10} /> Par région
                </div>
                <ul className="space-y-0.5 text-sm">
                  {REGIONS.map((r) => (
                    <li key={r.slug}>
                      <Link
                        href={`${prefix}/region/${r.slug}` as any}
                        className="block px-2 py-1.5 rounded-lg text-zinc-200 hover:bg-pink-500/10 hover:text-pink-300 transition"
                      >
                        {r.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Colonne 3 : Top villes + raccourcis */}
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-1">
                  <MapPin size={10} /> Top villes
                </div>
                <ul className="space-y-0.5 text-sm">
                  {TOP_CITIES.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`${prefix}/blog/top-10-bars-lgbt-${c.slug}` as any}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded-lg text-zinc-200 hover:bg-violet-500/10 hover:text-violet-300 transition"
                      >
                        <span className="text-violet-400/60 text-[10px] w-12 truncate">{c.region.slice(0, 3).toUpperCase()}.</span>
                        <span>{c.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-white/5 space-y-1.5">
                  <Link
                    href={`${prefix}/pride` as any}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/25 via-violet-500/25 to-cyan-500/25 hover:from-pink-500/40 hover:via-violet-500/40 hover:to-cyan-500/40 text-white font-black text-xs transition group"
                  >
                    <span className="flex items-center gap-2">
                      🌈 Pride 365 — Calendrier 2026
                    </span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition" />
                  </Link>
                  <Link
                    href={`${prefix}/lieux` as any}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-200 font-bold text-xs transition group"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin size={12} /> Carte interactive
                    </span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition" />
                  </Link>
                  <Link
                    href={`${prefix}/blog` as any}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition group"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles size={12} /> Guides &amp; Top 10
                    </span>
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
