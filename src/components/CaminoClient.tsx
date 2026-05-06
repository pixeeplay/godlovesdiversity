'use client';
import { useEffect, useState } from 'react';
import { Loader2, Footprints, Sparkles, ArrowRight, Heart, Flame } from 'lucide-react';

interface CaminoPath {
  id: string;
  slug: string;
  name: string;
  faith: string;
  totalKm: number;
  description?: string;
  emoji: string;
  color: string;
  startCity?: string;
  endCity?: string;
  kmDone: number;
}

interface CaminoStep {
  id: string;
  order: number;
  name: string;
  kmFromStart: number;
  description?: string;
  scriptureQuote?: string;
}

const FAITH_LABEL: Record<string, string> = {
  catholic: 'Catholicisme',
  interfaith: 'Inter-religieux',
  hindu: 'Hindouisme',
  buddhist: 'Bouddhisme',
  muslim: 'Islam'
};

export function CaminoClient() {
  const [paths, setPaths] = useState<CaminoPath[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [details, setDetails] = useState<{ path: any; progress: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch('/api/camino');
      const j = await r.json();
      setPaths(j.paths || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!activePath) { setDetails(null); return; }
    (async () => {
      const r = await fetch(`/api/camino?slug=${activePath}`);
      const j = await r.json();
      setDetails(j);
    })();
  }, [activePath]);

  async function contribute(slug: string, source: string, km = 1) {
    setContributing(true);
    try {
      const r = await fetch(`/api/camino?slug=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, km })
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(`✓ +${km} km ajouté(s) au Camino collectif`);
        // Refresh
        const r2 = await fetch(`/api/camino?slug=${slug}`);
        const j2 = await r2.json();
        setDetails(j2);
        const r3 = await fetch('/api/camino');
        const j3 = await r3.json();
        setPaths(j3.paths || []);
      } else {
        setMsg(`⚠ ${j.error || 'Échec'}`);
      }
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setContributing(false);
    setTimeout(() => setMsg(null), 4000);
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  if (paths.length === 0) {
    return (
      <main className="container-wide py-12 max-w-4xl">
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-8 text-center">
          <Footprints size={36} className="text-amber-400 mx-auto mb-3" />
          <h1 className="font-display font-bold text-2xl mb-2">Camino virtuel — bientôt</h1>
          <p className="text-sm text-amber-200/80 max-w-xl mx-auto">
            5 chemins de pèlerinage seront pré-remplis prochainement. Admin : <code className="bg-amber-500/20 px-1 rounded">POST /api/admin/seed-camino</code> pour seed initial.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-3 mb-3">
          <Footprints size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Camino virtuel collectif</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          Chaque prière, chaque intention, chaque bougie virtuelle fait avancer la communauté GLD sur un chemin de pèlerinage. Marchons ensemble.
        </p>
      </header>

      {!activePath ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paths.map(p => {
            const pct = Math.min(100, Math.round((p.kmDone / Math.max(1, p.totalKm)) * 100));
            return (
              <button
                key={p.id}
                onClick={() => setActivePath(p.slug)}
                className="text-left bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 hover:border-amber-500/40 rounded-2xl p-5 transition group"
                style={{ borderTopColor: p.color, borderTopWidth: 4 }}
              >
                <div className="text-4xl mb-2">{p.emoji}</div>
                <h3 className="font-bold text-base mb-1">{p.name}</h3>
                <div className="text-[11px] text-zinc-500 mb-3">{FAITH_LABEL[p.faith] || p.faith} · {p.totalKm} km</div>
                <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{p.description}</p>
                <div className="bg-zinc-950 rounded-full h-2 overflow-hidden mb-1">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-500">{p.kmDone} km parcourus</span>
                  <span className="font-bold text-amber-300">{pct}%</span>
                </div>
                <div className="mt-3 text-xs text-amber-400 group-hover:underline flex items-center gap-1">
                  Voir le chemin <ArrowRight size={11} />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <CaminoDetail
          slug={activePath}
          details={details}
          onBack={() => setActivePath(null)}
          onContribute={(source, km) => contribute(activePath, source, km)}
          contributing={contributing}
          msg={msg}
        />
      )}

      <div className="mt-8 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 text-center">
        💡 Le Camino est collectif. Chaque action dans GLD (rejoindre un cercle, partager une intention, allumer une bougie) ajoute automatiquement 1 km à un chemin choisi.
      </div>
    </main>
  );
}

function CaminoDetail({ slug, details, onBack, onContribute, contributing, msg }: any) {
  if (!details) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  const { path, progress } = details;
  const steps: CaminoStep[] = path.steps || [];
  const currentStep = steps.find(s => s.kmFromStart >= progress.kmDone) || steps[steps.length - 1];

  return (
    <div>
      <button onClick={onBack} className="text-fuchsia-400 hover:underline text-xs mb-4">← Tous les chemins</button>

      <header className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-2 rounded-2xl p-6 mb-4" style={{ borderColor: path.color }}>
        <div className="flex items-start gap-4">
          <div className="text-5xl">{path.emoji}</div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-2xl mb-1">{path.name}</h2>
            <p className="text-zinc-400 text-sm">{path.description}</p>
            <div className="text-[11px] text-zinc-500 mt-1">
              📍 {path.startCity} → {path.endCity} · {path.totalKm} km
            </div>
          </div>
        </div>

        {/* Progress bar grande */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold" style={{ color: path.color }}>
              {progress.kmDone} km parcourus collectivement
            </span>
            <span className="text-zinc-400">{progress.contributions} contributions · {progress.percent}%</span>
          </div>
          <div className="bg-zinc-950 rounded-full h-4 overflow-hidden relative">
            <div className="h-full transition-all" style={{ width: `${progress.percent}%`, backgroundColor: path.color }} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">
              {currentStep ? `Prochain : ${currentStep.name}` : '🏁 Achevé !'}
            </div>
          </div>
        </div>

        {/* Boutons contribuer */}
        <div className="mt-5 grid sm:grid-cols-3 gap-2">
          <button onClick={() => onContribute('intention', 1)} disabled={contributing} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-full flex items-center justify-center gap-1.5">
            <Heart size={11} /> +1 km · Intention
          </button>
          <button onClick={() => onContribute('candle', 1)} disabled={contributing} className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold py-2 px-3 rounded-full flex items-center justify-center gap-1.5">
            <Flame size={11} /> +1 km · Bougie
          </button>
          <button onClick={() => onContribute('meditation', 5)} disabled={contributing} className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-full flex items-center justify-center gap-1.5">
            <Sparkles size={11} /> +5 km · Méditation 10 min
          </button>
        </div>
        {msg && <div className="mt-3 text-xs text-emerald-300 text-center">{msg}</div>}
      </header>

      {/* Étapes */}
      <h3 className="text-xs uppercase font-bold tracking-widest text-zinc-400 mb-3">Étapes du chemin ({steps.length})</h3>
      <ol className="space-y-3">
        {steps.map((s: CaminoStep, i: number) => {
          const isPassed = progress.kmDone >= s.kmFromStart;
          const isCurrent = !isPassed && (i === 0 || progress.kmDone >= steps[i - 1].kmFromStart);
          return (
            <li
              key={s.id}
              className={`bg-zinc-900 border rounded-xl p-4 flex items-start gap-4 transition ${
                isCurrent ? 'border-amber-500 ring-2 ring-amber-500/30' : isPassed ? 'border-emerald-500/40 opacity-70' : 'border-zinc-800'
              }`}
            >
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${
                isPassed ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-500 text-black animate-pulse' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {isPassed ? '✓' : s.order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h4 className="font-bold">{s.name}</h4>
                  <span className="text-[10px] text-zinc-500 font-mono">km {s.kmFromStart}</span>
                  {isCurrent && <span className="text-[10px] bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">▸ Étape actuelle</span>}
                </div>
                {s.description && <p className="text-xs text-zinc-400">{s.description}</p>}
                {s.scriptureQuote && (
                  <blockquote className="mt-2 italic text-xs text-zinc-300 border-l-2 border-amber-500/40 pl-3">
                    « {s.scriptureQuote} »
                  </blockquote>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
