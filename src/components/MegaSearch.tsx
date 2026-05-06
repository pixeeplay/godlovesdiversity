'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  title: string;
  href: string;
  category: string;
  subtitle?: string;
}

interface Props {
  scope?: 'all' | 'admin' | 'public';
  placeholder?: string;
  className?: string;
}

const CATEGORY_LABEL: Record<string, { label: string; emoji: string; color: string }> = {
  page:   { label: 'Page',     emoji: '📄', color: 'text-cyan-300' },
  admin:  { label: 'Admin',    emoji: '⚙️', color: 'text-fuchsia-300' },
  venue:  { label: 'Lieu',     emoji: '📍', color: 'text-emerald-300' },
  forum:  { label: 'Forum',    emoji: '💬', color: 'text-violet-300' },
  event:  { label: 'Événement', emoji: '📅', color: 'text-amber-300' }
};

export function MegaSearch({ scope = 'all', placeholder = 'Rechercher une page, un lieu, un événement…', className = '' }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, scope]);

  // Raccourci clavier global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function go(item: SearchResult) {
    router.push(item.href);
    setOpen(false);
    setQ('');
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

  // Group by category
  const grouped = results.reduce((acc: Record<string, SearchResult[]>, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-fuchsia-500/60 transition">
        <Search size={14} className="text-zinc-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder-zinc-500"
        />
        {loading && <Loader2 size={12} className="animate-spin text-zinc-400 flex-shrink-0" />}
        {q && (
          <button onClick={() => { setQ(''); setResults([]); inputRef.current?.focus(); }} className="text-zinc-500 hover:text-white flex-shrink-0">
            <X size={12} />
          </button>
        )}
        <kbd className="hidden md:inline-block bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-[10px] text-zinc-400">⌘K</kbd>
      </div>

      {open && q.length >= 2 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 max-h-[70vh] overflow-y-auto">
            {results.length === 0 && !loading ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                Aucun résultat pour <b>« {q} »</b>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => {
                const meta = CATEGORY_LABEL[category] || { label: category, emoji: '•', color: 'text-zinc-300' };
                return (
                  <div key={category} className="border-b border-zinc-800 last:border-b-0">
                    <div className={`px-3 py-1.5 bg-zinc-800/50 text-[10px] uppercase font-bold ${meta.color}`}>
                      {meta.emoji} {meta.label} ({items.length})
                    </div>
                    {items.map((r, i) => {
                      const globalIdx = results.indexOf(r);
                      return (
                        <button
                          key={r.href + i}
                          onClick={() => go(r)}
                          className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-3 hover:bg-zinc-800 transition ${activeIdx === globalIdx ? 'bg-zinc-800' : ''}`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{r.title}</div>
                            {r.subtitle && <div className="text-[10px] text-zinc-500 truncate">{r.subtitle}</div>}
                            <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{r.href}</div>
                          </div>
                          <ArrowRight size={12} className="text-zinc-500 flex-shrink-0 mt-1" />
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
            <div className="px-3 py-2 bg-zinc-800/30 text-[10px] text-zinc-500 flex items-center justify-between border-t border-zinc-800">
              <span>↑↓ Naviguer · ↵ Ouvrir · Esc Fermer</span>
              <span className="font-mono">{results.length} résultat{results.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
