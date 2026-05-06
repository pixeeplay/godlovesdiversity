'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, Loader2, X, Sparkles, MapPin, Calendar, MessageSquare, FileText, Settings } from 'lucide-react';

/**
 * Dynamic Island Search — barre de recherche flottante style iOS Live Activity
 *
 * États :
 * - idle (pill compact)            : juste l'icône loupe + label "Rechercher"
 * - typing                         : barre élargie avec input
 * - results (expanded popover)     : résultats groupés
 * - live activity (search/loading) : pulse + spinner intégré
 * - hint (raccourci clavier ⌘K)    : badge à droite
 */

interface SearchResult {
  title: string;
  href: string;
  category: string;
  subtitle?: string;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  page:   { label: 'Page',     icon: FileText,        color: 'text-cyan-300',    bg: 'bg-cyan-500/15'    },
  admin:  { label: 'Admin',    icon: Settings,        color: 'text-fuchsia-300', bg: 'bg-fuchsia-500/15' },
  venue:  { label: 'Lieu',     icon: MapPin,          color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
  forum:  { label: 'Forum',    icon: MessageSquare,   color: 'text-violet-300',  bg: 'bg-violet-500/15'  },
  event:  { label: 'Event',    icon: Calendar,        color: 'text-amber-300',   bg: 'bg-amber-500/15'   }
};

interface Props {
  scope?: 'all' | 'admin' | 'public';
  className?: string;
  /** Si true (mobile), prend toute la largeur disponible */
  fullWidth?: boolean;
}

export function DynamicIslandSearch({ scope = 'all', className = '', fullWidth = false }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Search avec debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&scope=${scope}`);
        const j = await r.json();
        setResults(j.results || []);
        setActiveIdx(0);
      } catch { setResults([]); }
      setLoading(false);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, scope]);

  // ⌘K / Ctrl+K + Esc + Click outside
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQ('');
        inputRef.current?.blur();
      }
    };
    const onClickOut = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClickOut);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onClickOut);
    };
  }, []);

  function go(item: SearchResult) {
    router.push(item.href);
    setOpen(false);
    setQ('');
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[activeIdx]) {
      e.preventDefault();
      go(results[activeIdx]);
    }
  }

  // Group results
  const grouped = results.reduce((acc: Record<string, SearchResult[]>, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  // Statut live (Live Activity-like)
  const liveStatus =
    loading ? { label: 'Recherche…', icon: Loader2, spin: true, color: 'text-fuchsia-300' } :
    q.length >= 2 && results.length > 0 ? { label: `${results.length} résultat${results.length > 1 ? 's' : ''}`, icon: Sparkles, spin: false, color: 'text-emerald-300' } :
    q.length >= 2 ? { label: 'Aucun résultat', icon: X, spin: false, color: 'text-zinc-400' } :
    null;

  return (
    <div
      ref={wrapRef}
      className={`relative ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {/* PILL "Dynamic Island" */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
        className={`
          group flex items-center gap-2.5 transition-all duration-300 ease-out
          ${open ? 'scale-100' : 'hover:scale-[1.02]'}
          ${fullWidth ? 'w-full' : ''}
          bg-black/80 backdrop-blur-xl border border-white/10 hover:border-fuchsia-500/40
          rounded-full px-4 py-2 shadow-2xl shadow-black/40
        `}
      >
        <div className="relative shrink-0">
          {liveStatus ? (
            <liveStatus.icon size={14} className={`${liveStatus.color} ${liveStatus.spin ? 'animate-spin' : ''}`} />
          ) : (
            <Search size={14} className="text-zinc-300 group-hover:text-fuchsia-300 transition" />
          )}
          {/* Pulse halo si loading */}
          {loading && (
            <span className="absolute -inset-1 rounded-full bg-fuchsia-500/30 animate-ping" />
          )}
        </div>
        <span className={`text-xs font-medium ${liveStatus ? liveStatus.color : 'text-zinc-300'} ${fullWidth ? 'flex-1 text-left' : ''}`}>
          {liveStatus ? liveStatus.label : 'Rechercher'}
        </span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 bg-white/10 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* DROPDOWN expanded (sous la pill) */}
      {open && (
        <>
          {/* Backdrop scrim */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
            onClick={() => setOpen(false)}
          />

          {/* Panel : centré sur desktop, full-width mobile */}
          <div
            className="
              fixed md:absolute z-50
              top-[10vh] md:top-[calc(100%+8px)]
              left-2 right-2 md:left-auto md:right-0 md:w-[640px]
              max-h-[80vh] md:max-h-[70vh]
              bg-zinc-950/95 backdrop-blur-2xl border border-white/15
              rounded-3xl shadow-2xl shadow-black/60
              overflow-hidden
              flex flex-col
            "
          >
            {/* Search header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
              <Search size={16} className="text-fuchsia-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Lieu, page, événement, forum…"
                className="flex-1 bg-transparent outline-none text-base placeholder-zinc-500 text-white"
                autoFocus
              />
              {loading && <Loader2 size={14} className="text-fuchsia-300 animate-spin shrink-0" />}
              {q && !loading && (
                <button onClick={() => { setQ(''); setResults([]); inputRef.current?.focus(); }} className="text-zinc-500 hover:text-white shrink-0 p-1">
                  <X size={14} />
                </button>
              )}
              <kbd className="hidden md:inline-block bg-white/10 border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">Esc</kbd>
            </div>

            {/* Live activity bar */}
            {liveStatus && (
              <div className={`px-5 py-2 text-[11px] font-bold flex items-center gap-2 border-b border-white/5 ${liveStatus.color}`}>
                <liveStatus.icon size={11} className={liveStatus.spin ? 'animate-spin' : ''} />
                {liveStatus.label}
                {q && <span className="text-zinc-500 font-normal">pour « <span className="text-zinc-300">{q}</span> »</span>}
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {q.length < 2 ? (
                <SuggestionsPanel onPick={(href) => go({ title: '', href, category: 'page' })} />
              ) : results.length === 0 && !loading ? (
                <div className="p-10 text-center">
                  <Search size={28} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-400 text-sm">Aucun résultat pour <b className="text-zinc-200">« {q} »</b></p>
                  <p className="text-[11px] text-zinc-600 mt-1">Essaie un autre mot-clé, un nom de ville ou un type de lieu.</p>
                </div>
              ) : (
                Object.entries(grouped).map(([cat, items]) => {
                  const meta = CATEGORY_META[cat] || { label: cat, icon: FileText, color: 'text-zinc-300', bg: 'bg-zinc-500/15' };
                  const Icon = meta.icon;
                  return (
                    <div key={cat} className="border-b border-white/5 last:border-b-0">
                      <div className={`px-5 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${meta.color}`}>
                        <Icon size={10} /> {meta.label} ({items.length})
                      </div>
                      {items.map((r, i) => {
                        const globalIdx = results.indexOf(r);
                        const isActive = activeIdx === globalIdx;
                        return (
                          <button
                            key={r.href + i}
                            onClick={() => go(r)}
                            onMouseEnter={() => setActiveIdx(globalIdx)}
                            className={`w-full text-left px-5 py-2.5 flex items-start gap-3 transition ${isActive ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Icon size={13} className={meta.color} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-white truncate">{r.title}</div>
                              {r.subtitle && <div className="text-[11px] text-zinc-400 truncate">{r.subtitle}</div>}
                              <div className="text-[10px] text-zinc-600 font-mono truncate">{r.href}</div>
                            </div>
                            {isActive && <ArrowRight size={13} className="text-fuchsia-400 shrink-0 mt-2" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer : raccourcis */}
            <div className="px-5 py-2.5 bg-black/40 border-t border-white/5 text-[10px] text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-white/10 border border-white/10 rounded px-1 py-0.5 font-mono">↑↓</kbd> Naviguer</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/10 border border-white/10 rounded px-1 py-0.5 font-mono">↵</kbd> Ouvrir</span>
                <span className="flex items-center gap-1 hidden sm:inline-flex"><kbd className="bg-white/10 border border-white/10 rounded px-1 py-0.5 font-mono">esc</kbd> Fermer</span>
              </span>
              <span className="font-mono text-zinc-600">GLD Search</span>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

function SuggestionsPanel({ onPick }: { onPick: (href: string) => void }) {
  const SUGGESTIONS = [
    { label: 'Lieux LGBT-friendly', href: '/lieux',         emoji: '📍' },
    { label: 'Forum communauté',    href: '/forum',         emoji: '💬' },
    { label: 'Newsletter',          href: '/newsletter',    emoji: '📧' },
    { label: 'Cercles de prière',   href: '/cercles-priere',emoji: '🙏' },
    { label: 'Boutique',            href: '/boutique',      emoji: '🏳️‍🌈' },
    { label: 'Galerie',             href: '/galerie',       emoji: '🖼️' },
    { label: 'Mentor',              href: '/mentor',        emoji: '🤝' },
    { label: 'Manuel utilisateur',  href: '/api/manual/user', emoji: '📖' }
  ];
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-3 px-1 flex items-center gap-1.5">
        <Sparkles size={10} className="text-fuchsia-400" /> Suggestions populaires
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.href}
            onClick={() => onPick(s.href)}
            className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-fuchsia-500/30 rounded-xl p-3 text-center transition group"
          >
            <div className="text-2xl mb-1.5 group-hover:scale-110 transition">{s.emoji}</div>
            <div className="text-[11px] font-bold text-zinc-200 group-hover:text-white">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
