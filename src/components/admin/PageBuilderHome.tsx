'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layout, ChevronRight, Loader2, Search, RefreshCw, FileCode, Edit3, AlertCircle } from 'lucide-react';

interface PageInfo {
  slug: string;
  label: string;
  desc: string;
  emoji: string;
  blockCount: number;
  hasCode: boolean;
  status: 'edited' | 'codeOnly' | 'orphan';
}

const STATUS_META: Record<string, { color: string; label: string; icon: any }> = {
  edited:   { color: 'fuchsia', label: 'Édité dans builder',   icon: Edit3 },
  codeOnly: { color: 'cyan',    label: 'Code only',           icon: FileCode },
  orphan:   { color: 'amber',   label: 'Orphelin DB',         icon: AlertCircle }
};

export function PageBuilderHome() {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'edited' | 'codeOnly' | 'orphan'>('all');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/page-builder/discover', { cache: 'no-store' });
    const j = await r.json();
    setPages(j.pages || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = pages.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.label.toLowerCase().includes(search.toLowerCase()) && !p.slug.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: pages.length,
    edited: pages.filter((p) => p.status === 'edited').length,
    codeOnly: pages.filter((p) => p.status === 'codeOnly').length,
    orphan: pages.filter((p) => p.status === 'orphan').length
  };

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-600 rounded-2xl p-5 mb-4 ring-1 ring-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.2),transparent)]" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">🎨</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-black text-white tracking-tight">Page Builder</h1>
            <p className="text-white/85 text-sm mt-0.5">
              Édite visuellement les pages du site — preview live + import contenu existant
            </p>
          </div>
          <button onClick={load} className="bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-2 rounded-full flex items-center gap-1.5">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Scanner
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une page…"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-1.5 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} count={counts.all}>Toutes</FilterPill>
          <FilterPill active={filter === 'edited'} onClick={() => setFilter('edited')} count={counts.edited} color="fuchsia">Éditées</FilterPill>
          <FilterPill active={filter === 'codeOnly'} onClick={() => setFilter('codeOnly')} count={counts.codeOnly} color="cyan">Code only</FilterPill>
          {counts.orphan > 0 && <FilterPill active={filter === 'orphan'} onClick={() => setFilter('orphan')} count={counts.orphan} color="amber">Orphelines</FilterPill>}
        </div>
      </div>

      {/* Helper banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 mb-3 text-[11px] text-cyan-200/90">
        <p>
          💡 <strong>Code only</strong> = page Next.js existante non encore éditée dans le builder.
          Ouvre-la pour voir l'aperçu live et clique <strong>« Importer la page actuelle »</strong> pour convertir son contenu en blocs éditables.
        </p>
      </div>

      {/* List */}
      {loading && pages.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-12 flex items-center justify-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Scan des pages…
        </p>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
          <Layout size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-300">Aucune page ne correspond.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            return (
              <Link
                key={p.slug}
                href={`/admin/page-builder/${p.slug}`}
                className="group bg-zinc-900 hover:bg-zinc-800/50 ring-1 ring-zinc-800 hover:ring-fuchsia-500/50 rounded-2xl p-3.5 flex items-center gap-3 transition relative"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center text-xl shrink-0 group-hover:from-fuchsia-500 group-hover:to-violet-500 transition">
                  {p.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-sm text-white truncate">{p.label}</h3>
                    <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-${meta.color}-500/15 text-${meta.color}-300 flex items-center gap-1`}>
                      <Icon size={9} /> {meta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">{p.desc}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px]">
                    <code className="text-zinc-600">/{p.slug}</code>
                    {p.blockCount > 0 && (
                      <span className="text-fuchsia-400">{p.blockCount} bloc{p.blockCount > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="text-zinc-500 group-hover:text-fuchsia-300 transition flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, count, children, color = 'zinc' }: {
  active: boolean; onClick: () => void; count: number; children: any; color?: string;
}) {
  const activeColors: Record<string, string> = {
    zinc: 'bg-fuchsia-500 text-white',
    fuchsia: 'bg-fuchsia-500 text-white',
    cyan: 'bg-cyan-500 text-white',
    amber: 'bg-amber-500 text-white'
  };
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full transition flex items-center gap-1 ${
        active ? activeColors[color] : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
      }`}
    >
      {children} <span className="text-[10px] opacity-70">{count}</span>
    </button>
  );
}
