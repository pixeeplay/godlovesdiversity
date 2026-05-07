'use client';
import { useEffect, useMemo, useState } from 'react';
import { Tv, Filter, MapPin, Play, ExternalLink, Search, RefreshCw, Loader2, Sparkles } from 'lucide-react';

interface LiveCam {
  id: string;
  name: string;
  city: string;
  country: string;
  faith: string;
  emoji: string;
  description: string;
  externalUrl: string;
  schedule?: string;
  inclusive?: boolean;
  discoveredBy?: string;
  live: boolean;
  videoId: string | null;
  liveTitle?: string;
  thumbnailUrl?: string;
  embedUrl: string | null;
}

interface ApiResp {
  ok: boolean;
  total: number;
  live: number;
  offline: number;
  durationMs: number;
  cams: LiveCam[];
}

const FAITH_META: Record<string, { label: string; emoji: string; color: string }> = {
  catholic:    { label: 'Catholique',     emoji: '✝️',  color: '#dc2626' },
  protestant:  { label: 'Protestant',     emoji: '✠',   color: '#1e40af' },
  orthodox:    { label: 'Orthodoxe',      emoji: '☦️',  color: '#7c3aed' },
  muslim:      { label: 'Islam',           emoji: '☪️',  color: '#059669' },
  jewish:      { label: 'Judaïsme',       emoji: '✡️',  color: '#3b82f6' },
  buddhist:    { label: 'Bouddhisme',     emoji: '☸️',  color: '#f59e0b' },
  hindu:       { label: 'Hindouisme',     emoji: '🕉️',  color: '#ec4899' },
  sikh:        { label: 'Sikhisme',       emoji: '☬',   color: '#f97316' },
  pride:       { label: 'Pride / Live', emoji: '🌈',  color: '#ff2d92' }
};

export function WebcamsLiveClient() {
  const [data, setData] = useState<ApiResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFaiths, setActiveFaiths] = useState<Set<string>>(new Set());
  const [inclusiveOnly, setInclusiveOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCam, setActiveCam] = useState<LiveCam | null>(null);

  async function load(force = false) {
    if (force) setRefreshing(true); else setLoading(true);
    try {
      const r = await fetch(`/api/webcams/live${force ? '?force=1' : ''}`, { cache: 'no-store' });
      const j: ApiResp = await r.json();
      setData(j);
    } catch {
      setData({ ok: false, total: 0, live: 0, offline: 0, durationMs: 0, cams: [] });
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data?.cams) return [];
    return data.cams.filter(c => {
      if (activeFaiths.size > 0 && !activeFaiths.has(c.faith)) return false;
      if (inclusiveOnly && !c.inclusive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.city.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, activeFaiths, inclusiveOnly, search]);

  function toggleFaith(f: string) {
    setActiveFaiths(prev => {
      const n = new Set(prev);
      if (n.has(f)) n.delete(f); else n.add(f);
      return n;
    });
  }

  const counts: Record<string, number> = {};
  for (const c of (data?.cams || [])) counts[c.faith] = (counts[c.faith] || 0) + 1;

  return (
    <main className="container-wide py-12 max-w-7xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-rose-500 via-fuchsia-500 to-cyan-500 rounded-2xl p-3 mb-3">
          <Tv size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Webcams live des lieux saints</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          {loading ? 'Vérification en cours…' : (
            <>
              <strong className="text-emerald-400">{data?.live || 0} flux live</strong> en ce moment sur {data?.total || 0} sources connues.
              {(data?.offline || 0) > 0 && <span className="text-zinc-500"> ({data?.offline} hors d'office actuellement, masqués)</span>}
            </>
          )}
        </p>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="mt-3 inline-flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-4 py-2 rounded-full font-bold"
        >
          {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Re-vérifier maintenant
        </button>
      </header>

      {/* Filtres (uniquement si on a des résultats) */}
      {!loading && (data?.cams?.length || 0) > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <Filter size={14} className="text-zinc-500" />
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Filtrer par confession</span>
            <button
              onClick={() => setActiveFaiths(new Set())}
              className={`text-[11px] px-3 py-1.5 rounded-full font-bold ${activeFaiths.size === 0 ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
            >
              Toutes ({data?.cams?.length || 0})
            </button>
            {Object.entries(FAITH_META).map(([id, meta]) => {
              if (!counts[id]) return null;
              const active = activeFaiths.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleFaith(id)}
                  className="text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition"
                  style={{
                    backgroundColor: active ? meta.color : 'rgb(39, 39, 42)',
                    color: active ? 'white' : 'rgb(212, 212, 216)'
                  }}
                >
                  <span>{meta.emoji}</span> {meta.label} ({counts[id]})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-zinc-950 border border-zinc-700 rounded-lg px-3">
              <Search size={12} className="text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher un lieu, une ville…"
                className="bg-transparent flex-1 px-1 py-1.5 text-sm outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={inclusiveOnly} onChange={(e) => setInclusiveOnly(e.target.checked)} className="accent-fuchsia-500" />
              🌈 LGBT-friendly seulement
            </label>
            <span className="text-[11px] text-zinc-500 ml-auto">{filtered.length} résultats</span>
          </div>
        </section>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-20">
          <Loader2 size={32} className="animate-spin text-fuchsia-400 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Vérification de chaque sanctuaire (chaînes YouTube)…</p>
          <p className="text-zinc-500 text-[11px] mt-2">Ça prend ~5s, on filtre en temps réel les flux qui ne sont pas en cours.</p>
        </div>
      )}

      {/* Empty state — aucun flux live */}
      {!loading && (data?.cams?.length || 0) === 0 && (
        <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <Tv size={48} className="text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-300 font-bold mb-2">Aucun lieu saint ne diffuse en ce moment.</p>
          <p className="text-zinc-500 text-xs max-w-md mx-auto mb-4">
            Les diffusions live dépendent des heures d'office (matins/soirs selon le fuseau).
            Reviens dans quelques heures, ou clique sur "Re-vérifier" pour rafraîchir.
          </p>
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-2 text-xs bg-fuchsia-500 hover:bg-fuchsia-400 text-white px-4 py-2 rounded-full font-bold"
          >
            <RefreshCw size={12} /> Re-vérifier
          </button>
        </div>
      )}

      {/* Grid des webcams live */}
      {!loading && filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const meta = FAITH_META[c.faith] || FAITH_META.pride;
            return (
              <article
                key={c.id}
                className="bg-zinc-900 border-2 rounded-2xl overflow-hidden hover:border-fuchsia-500/50 transition cursor-pointer group"
                style={{ borderColor: meta?.color + '40' }}
                onClick={() => setActiveCam(c)}
              >
                <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                  {c.thumbnailUrl ? (
                    <img
                      src={c.thumbnailUrl}
                      alt={c.name}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                      onError={(e) => {
                        // fallback hqdefault si maxres pas dispo
                        const img = e.target as HTMLImageElement;
                        if (c.videoId && img.src.includes('maxresdefault')) {
                          img.src = `https://img.youtube.com/vi/${c.videoId}/hqdefault.jpg`;
                        }
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-rose-500/90 backdrop-blur-md rounded-full p-4 group-hover:scale-110 transition shadow-2xl shadow-rose-500/50">
                      <Play size={24} className="text-white" fill="white" />
                    </div>
                  </div>
                  <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> EN DIRECT
                  </span>
                  {c.inclusive && (
                    <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                      🌈 Inclusif
                    </span>
                  )}
                  {c.discoveredBy === 'ai-cron' && (
                    <span className="absolute bottom-2 right-2 bg-cyan-500/90 text-white text-[9px] font-bold px-2 py-1 rounded flex items-center gap-1" title="Découvert par l'agent IA">
                      <Sparkles size={9} /> IA
                    </span>
                  )}
                  <div className="absolute bottom-2 left-2 text-3xl drop-shadow-lg">{c.emoji}</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white">{c.name}</h3>
                  <div className="text-xs text-zinc-400 flex items-center gap-1 mb-2 mt-0.5">
                    <MapPin size={10} /> {c.city}, {c.country}
                  </div>
                  {c.liveTitle && (
                    <p className="text-[11px] text-emerald-300 line-clamp-1 mb-1.5 italic">"{c.liveTitle}"</p>
                  )}
                  <p className="text-xs text-zinc-300 line-clamp-2 mb-2">{c.description}</p>
                  {c.schedule && (
                    <div className="text-[10px] text-amber-300 mb-2">⏰ {c.schedule}</div>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: meta.color + '30', color: meta.color }}>
                    {meta.emoji} {meta.label}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal player */}
      {activeCam && activeCam.embedUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setActiveCam(null)}>
          <div className="bg-zinc-950 border border-fuchsia-500/40 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeCam.emoji}</span>
                <div>
                  <h2 className="font-bold">{activeCam.name}</h2>
                  <p className="text-[11px] text-zinc-400">{activeCam.city}, {activeCam.country} {activeCam.schedule ? `· ${activeCam.schedule}` : ''}</p>
                </div>
              </div>
              <button onClick={() => setActiveCam(null)} className="text-zinc-400 hover:text-white text-3xl leading-none">&times;</button>
            </header>
            <div className="aspect-video bg-zinc-900">
              <iframe
                src={activeCam.embedUrl}
                title={activeCam.name}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 flex flex-wrap gap-2 items-center">
              <p className="text-sm text-zinc-300 flex-1">{activeCam.description}</p>
              <a
                href={`https://www.youtube.com/watch?v=${activeCam.videoId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-rose-500 hover:bg-rose-400 text-white px-3 py-1.5 rounded-full flex items-center gap-1 font-bold"
              >
                <ExternalLink size={11} /> Ouvrir sur YouTube
              </a>
              <a
                href={activeCam.externalUrl}
                target="_blank" rel="noopener noreferrer"
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                <ExternalLink size={11} /> Site officiel
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-500/5 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-200 text-center">
        💡 La page ne montre que les flux <strong>réellement en direct</strong> sur YouTube en ce moment, pas de carte morte.
        Un agent IA scanne le web tous les 6h pour découvrir de nouveaux sanctuaires (badge <Sparkles size={10} className="inline" /> IA).
        Un lieu saint à proposer ? <a href="/contact?sujet=Webcam+live" className="underline font-bold ml-1">Contacte-nous</a>.
      </div>
    </main>
  );
}
