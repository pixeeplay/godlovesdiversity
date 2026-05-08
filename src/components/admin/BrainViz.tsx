'use client';
/**
 * BrainViz — visualisation cinématique du cerveau RAG « Demandez à GLD ».
 *
 * Le but : qu'en un coup d'œil, on capte
 *   - le NIVEAU d'intelligence (gauge IQ)
 *   - les CAPACITÉS (5 dimensions)
 *   - la STRUCTURE de la mémoire (constellation 2D + synapses)
 *   - la VITALITÉ (pulsations, activité récente, blind spots)
 *
 * 100 % SVG + Tailwind, zéro dépendance externe. Animations CSS.
 */
import { useEffect, useMemo, useState } from 'react';

/* ─── TYPES (alignés avec brain-stats.ts) ──────────────────────── */

type Dimensions = {
  memory: number; fluency: number; diversity: number; freshness: number; coverage: number;
};

type ConstellationNode = {
  id: string; docId: string; docTitle: string;
  x: number; y: number; weight: number; cluster: number; preview: string;
};

type Synapse = {
  fromId: string; toId: string; similarity: number;
  fromTitle: string; toTitle: string;
};

type BrainSnapshot = {
  iq: number;
  iqLabel: string;
  iqColor: 'gray' | 'amber' | 'emerald' | 'sky' | 'violet';
  dimensions: Dimensions;
  stats: {
    docs: number; docsEnabled: number; chunks: number; tokens: number;
    locales: number; sourceTypes: number; tags: number;
    avgChunkSize: number; avgEmbeddingNorm: number;
    oldestDoc?: string; newestDoc?: string;
    pendingQuestions: number; answeredRate: number; avgTopScore: number;
  };
  constellation: ConstellationNode[];
  synapses: Synapse[];
  topTags: { tag: string; count: number }[];
  sourceMix: { type: string; count: number; pct: number }[];
  localeMix: { locale: string; count: number; pct: number }[];
  timeline: { date: string; count: number }[];
  blindSpots: { question: string; topScore: number; createdAt: string }[];
  vitals: { pulseHz: number; activityLevel: number; healthLabel: string };
  generatedAt: number;
};

/* ─── PALETTE ──────────────────────────────────────────────────── */

const CLUSTER_COLORS = [
  '#f43f5e', '#ec4899', '#a855f7', '#6366f1',
  '#0ea5e9', '#06b6d4', '#10b981', '#f59e0b',
];

const IQ_COLORS: Record<BrainSnapshot['iqColor'], { ring: string; text: string; bg: string; glow: string }> = {
  gray:    { ring: '#94a3b8', text: 'text-slate-500',   bg: 'bg-slate-100',   glow: 'rgba(148,163,184,0.5)' },
  amber:   { ring: '#f59e0b', text: 'text-amber-600',   bg: 'bg-amber-100',   glow: 'rgba(245,158,11,0.55)' },
  emerald: { ring: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-100', glow: 'rgba(16,185,129,0.55)' },
  sky:     { ring: '#0ea5e9', text: 'text-sky-600',     bg: 'bg-sky-100',     glow: 'rgba(14,165,233,0.6)' },
  violet:  { ring: '#a855f7', text: 'text-violet-600',  bg: 'bg-violet-100',  glow: 'rgba(168,85,247,0.6)' },
};

/* ─── COMPOSANT PRINCIPAL ──────────────────────────────────────── */

export function BrainViz() {
  const [snap, setSnap] = useState<BrainSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/knowledge/brain${refreshKey > 0 ? '?force=1' : ''}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) setError(j.error);
        else setSnap(j as BrainSnapshot);
      })
      .catch((e) => !cancelled && setError(e?.message || 'fetch KO'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [refreshKey]);

  // Auto-refresh toutes les 60s
  useEffect(() => {
    const t = setInterval(() => setRefreshKey((k) => k + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading && !snap) return <LoadingScreen />;
  if (error && !snap) return <ErrorScreen error={error} onRetry={() => setRefreshKey((k) => k + 1)} />;
  if (!snap) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Étoiles d'arrière-plan */}
      <Starfield />

      <div className="relative mx-auto max-w-7xl px-4 py-8">
        <Header
          generatedAt={snap.generatedAt}
          onRefresh={() => setRefreshKey((k) => k + 1)}
          loading={loading}
        />

        {/* HERO : cerveau central + IQ */}
        <BrainHero snap={snap} />

        {/* DIMENSIONS COGNITIVES */}
        <section className="mt-10">
          <SectionTitle icon="🧬" title="Capacités cognitives" />
          <DimensionsRadar dim={snap.dimensions} pulseHz={snap.vitals.pulseHz} />
        </section>

        {/* CONSTELLATION */}
        <section className="mt-10">
          <SectionTitle
            icon="✨"
            title="Constellation de la mémoire"
            subtitle={`${snap.constellation.length} chunks projetés en 2D · ${snap.synapses.length} synapses fortes`}
          />
          <Constellation nodes={snap.constellation} synapses={snap.synapses} />
        </section>

        {/* TIMELINE + DISTRIBUTIONS */}
        <section className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card title="📈 Pouls d'ingestion (30j)">
            <Timeline data={snap.timeline} />
          </Card>
          <Card title="🌍 Couverture par langue">
            <DistroBar data={snap.localeMix.map((m) => ({ label: m.locale, count: m.count, pct: m.pct }))} />
          </Card>
          <Card title="📦 Mix de sources">
            <DistroBar data={snap.sourceMix.map((m) => ({ label: m.type, count: m.count, pct: m.pct }))} />
          </Card>
        </section>

        {/* TAGS HEATMAP + BLIND SPOTS */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="🏷️ Thèmes saillants">
            <TagCloud tags={snap.topTags} />
          </Card>
          <Card title="🌑 Zones aveugles (questions sans réponse)">
            <BlindSpots items={snap.blindSpots} />
          </Card>
        </section>

        {/* STATS BRUTES */}
        <section className="mt-6">
          <Card title="🔬 Diagnostic technique">
            <RawStats s={snap.stats} v={snap.vitals} />
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*                       SOUS-COMPOSANTS                           */
/* ═══════════════════════════════════════════════════════════════ */

function Header({ generatedAt, onRefresh, loading }: {
  generatedAt: number; onRefresh: () => void; loading: boolean;
}) {
  return (
    <header className="mb-8 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <h1 className="bg-gradient-to-r from-rose-400 via-fuchsia-400 to-violet-400 bg-clip-text text-3xl font-bold text-transparent">
            Cerveau de GLD
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Vue temps réel du système RAG « Demandez à GLD » · snapshot {new Date(generatedAt).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a href="/admin/ai/knowledge" className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
          ← Bibliothèque
        </a>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
        >
          {loading ? '⏳' : '↻'} Refresh
        </button>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-rose-500" />
        <p className="text-sm">Connexion neuronale en cours…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
      <div className="text-center">
        <div className="mb-4 text-6xl">💀</div>
        <p className="mb-4 text-rose-400">{error}</p>
        <button onClick={onRetry} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Réessayer</button>
      </div>
    </div>
  );
}

/* ─── HERO : CERVEAU + GAUGE IQ ────────────────────────────────── */

function BrainHero({ snap }: { snap: BrainSnapshot }) {
  const iqColors = IQ_COLORS[snap.iqColor];
  const iqAngle = (snap.iq / 200) * 270 - 135; // -135° à 135°

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* CERVEAU */}
      <div className="relative col-span-2 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 p-8 ring-1 ring-slate-800">
        <BrainSvg
          pulseHz={snap.vitals.pulseHz}
          activityLevel={snap.vitals.activityLevel}
          glow={iqColors.glow}
        />
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">État vital</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 animate-pulse rounded-full ${snap.vitals.activityLevel > 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="text-2xl font-bold">{snap.vitals.healthLabel}</span>
            </div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              Pulse {snap.vitals.pulseHz} Hz · Activité {snap.vitals.activityLevel}/100
            </div>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>{snap.stats.docsEnabled} / {snap.stats.docs} docs actifs</div>
            <div>{snap.stats.chunks.toLocaleString()} chunks indexés</div>
          </div>
        </div>
      </div>

      {/* GAUGE IQ */}
      <div className={`relative overflow-hidden rounded-3xl p-6 ring-1 ring-slate-800 ${iqColors.bg.replace('bg-', 'bg-opacity-10 bg-')}`}
           style={{ background: `radial-gradient(circle at 50% 30%, ${iqColors.glow}, transparent 70%), #0f172a` }}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-slate-400">Score d'intelligence</div>
          <div className="relative mx-auto mt-3 h-48 w-48">
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <linearGradient id="iqArc" x1="0" x2="1">
                  <stop offset="0" stopColor="#475569" />
                  <stop offset="1" stopColor={iqColors.ring} />
                </linearGradient>
              </defs>
              {/* Arc fond */}
              <path
                d="M 30 130 A 70 70 0 1 1 170 130"
                fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"
              />
              {/* Arc rempli */}
              <path
                d="M 30 130 A 70 70 0 1 1 170 130"
                fill="none" stroke="url(#iqArc)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(snap.iq / 200) * 330} 330`}
                style={{ transition: 'stroke-dasharray 1.2s ease-out' }}
              />
              {/* Aiguille */}
              <g style={{ transform: `rotate(${iqAngle}deg)`, transformOrigin: '100px 130px', transition: 'transform 1.2s ease-out' }}>
                <line x1="100" y1="130" x2="100" y2="60" stroke={iqColors.ring} strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="100" cy="130" r="6" fill={iqColors.ring} />
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold ${iqColors.text}`}>{snap.iq}</div>
              <div className="-mt-1 text-xs text-slate-400">/ 200</div>
            </div>
          </div>
          <div className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${iqColors.bg} ${iqColors.text}`}>
            {snap.iqLabel}
          </div>
          <div className="mt-3 text-[10px] text-slate-500">
            Composite : mémoire · fluidité · diversité · fraîcheur · couverture
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CERVEAU SVG ANATOMIQUE ───────────────────────────────────── */

function BrainSvg({ pulseHz, activityLevel, glow }: {
  pulseHz: number; activityLevel: number; glow: string;
}) {
  const pulseDuration = (1 / pulseHz).toFixed(2) + 's';
  const intensityOpacity = 0.3 + (activityLevel / 100) * 0.6;

  return (
    <div className="relative h-72 w-full">
      <svg viewBox="0 0 400 280" className="h-full w-full">
        <defs>
          <radialGradient id="brainGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={glow} stopOpacity="0.85" />
            <stop offset="55%" stopColor={glow} stopOpacity="0.18" />
            <stop offset="100%" stopColor={glow} stopOpacity="0" />
          </radialGradient>
          <filter id="brainBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Halo pulsant */}
        <circle cx="200" cy="140" r="120" fill="url(#brainGlow)" opacity={intensityOpacity}>
          <animate attributeName="r" values="115;135;115" dur={pulseDuration} repeatCount="indefinite" />
          <animate attributeName="opacity" values={`${intensityOpacity};${Math.min(1, intensityOpacity + 0.15)};${intensityOpacity}`} dur={pulseDuration} repeatCount="indefinite" />
        </circle>

        {/* Hémisphères */}
        <g filter="url(#brainBlur)" opacity="0.4">
          <ellipse cx="155" cy="140" rx="65" ry="72" fill="#7c3aed" />
          <ellipse cx="245" cy="140" rx="65" ry="72" fill="#ec4899" />
        </g>

        {/* Lignes des hémisphères */}
        <g fill="none" stroke="#fda4af" strokeWidth="1.5" opacity="0.85">
          <path d="M 155 80 Q 110 105 110 145 Q 110 195 155 215" />
          <path d="M 145 95 Q 100 130 115 175 Q 135 200 165 205" />
          <path d="M 165 110 Q 130 130 130 160 Q 140 180 170 185" />
          <path d="M 175 115 Q 155 135 160 165 Q 175 185 195 195" />
        </g>
        <g fill="none" stroke="#a78bfa" strokeWidth="1.5" opacity="0.85">
          <path d="M 245 80 Q 290 105 290 145 Q 290 195 245 215" />
          <path d="M 255 95 Q 300 130 285 175 Q 265 200 235 205" />
          <path d="M 235 110 Q 270 130 270 160 Q 260 180 230 185" />
          <path d="M 225 115 Q 245 135 240 165 Q 225 185 205 195" />
        </g>
        <line x1="200" y1="80" x2="200" y2="215" stroke="#fff" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />

        {/* Neurones qui s'allument */}
        {Array.from({ length: 18 }).map((_, i) => {
          const cx = 100 + Math.random() * 200;
          const cy = 90 + Math.random() * 110;
          const delay = (i / 18) * 2;
          return (
            <circle key={i} cx={cx} cy={cy} r="2" fill="#fff">
              <animate attributeName="opacity" values="0;1;0" dur={pulseDuration} begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="1;3.5;1" dur={pulseDuration} begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          );
        })}

        {/* Étincelles (synapses) */}
        {Array.from({ length: 8 }).map((_, i) => {
          const startX = 130 + Math.random() * 140;
          const startY = 100 + Math.random() * 80;
          const endX = startX + (Math.random() - 0.5) * 80;
          const endY = startY + (Math.random() - 0.5) * 60;
          const delay = Math.random() * 3;
          return (
            <line key={`s${i}`} x1={startX} y1={startY} x2={endX} y2={endY}
              stroke="#fff" strokeWidth="1" opacity="0">
              <animate attributeName="opacity" values="0;0.85;0" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
            </line>
          );
        })}

        {/* Cervelet stylisé en bas */}
        <ellipse cx="200" cy="225" rx="40" ry="14" fill="#9333ea" opacity="0.4" />
      </svg>
    </div>
  );
}

/* ─── DIMENSIONS COGNITIVES (RADAR PENTAGONAL) ─────────────────── */

function DimensionsRadar({ dim, pulseHz }: { dim: Dimensions; pulseHz: number }) {
  const labels = [
    { key: 'memory', label: 'Mémoire', emoji: '💾' },
    { key: 'fluency', label: 'Fluidité', emoji: '🌊' },
    { key: 'diversity', label: 'Diversité', emoji: '🌈' },
    { key: 'freshness', label: 'Fraîcheur', emoji: '🌱' },
    { key: 'coverage', label: 'Couverture', emoji: '🌍' },
  ] as const;

  const cx = 180, cy = 180, R = 130;
  const points = labels.map((_, i) => {
    const angle = (Math.PI * 2 * i) / labels.length - Math.PI / 2;
    return { angle, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });
  const valuePoints = labels.map((l, i) => {
    const v = dim[l.key as keyof Dimensions] / 100;
    return {
      x: cx + R * v * Math.cos(points[i].angle),
      y: cy + R * v * Math.sin(points[i].angle),
    };
  });
  const polygon = valuePoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex items-center justify-center rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        <svg viewBox="0 0 360 360" className="h-80 w-80">
          {/* Cercles de référence */}
          {[0.25, 0.5, 0.75, 1].map((r) => (
            <polygon
              key={r}
              points={points.map((p, i) => {
                const x = cx + R * r * Math.cos(p.angle);
                const y = cy + R * r * Math.sin(p.angle);
                return `${x},${y}`;
              }).join(' ')}
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray={r === 1 ? '' : '2 3'}
            />
          ))}
          {/* Axes */}
          {points.map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#334155" strokeWidth="1" />
          ))}
          {/* Polygone des valeurs (animé) */}
          <polygon points={polygon} fill="rgba(244,63,94,0.25)" stroke="#f43f5e" strokeWidth="2.5" style={{ transition: 'all 1s ease' }}>
            <animate attributeName="opacity" values="0.7;1;0.7" dur={`${(1 / pulseHz).toFixed(2)}s`} repeatCount="indefinite" />
          </polygon>
          {/* Sommets */}
          {valuePoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#f43f5e" />
          ))}
          {/* Labels */}
          {labels.map((l, i) => {
            const lx = cx + (R + 28) * Math.cos(points[i].angle);
            const ly = cy + (R + 28) * Math.sin(points[i].angle);
            return (
              <text key={i} x={lx} y={ly} fill="#cbd5e1" fontSize="13" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
                {l.emoji} {l.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Barres horizontales détaillées */}
      <div className="flex flex-col justify-center gap-3 rounded-2xl bg-slate-900 p-6 ring-1 ring-slate-800">
        {labels.map((l) => {
          const v = dim[l.key as keyof Dimensions];
          return (
            <div key={l.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-300">{l.emoji} {l.label}</span>
                <span className={`font-mono font-bold ${v < 30 ? 'text-amber-400' : v < 70 ? 'text-emerald-400' : 'text-violet-400'}`}>
                  {v}<span className="text-slate-500">/100</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-fuchsia-500 to-violet-500"
                  style={{ width: `${v}%`, transition: 'width 1s ease' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── CONSTELLATION 2D (PCA des chunks) ────────────────────────── */

function Constellation({ nodes, synapses }: { nodes: ConstellationNode[]; synapses: Synapse[] }) {
  const [hovered, setHovered] = useState<ConstellationNode | null>(null);
  const W = 800, H = 480;
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-900 text-slate-500 ring-1 ring-slate-800">
        Constellation vide — ingère des documents pour faire briller le cerveau ✨
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-violet-950 ring-1 ring-slate-800">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[480px] w-full">
        <defs>
          <radialGradient id="nodeGlow">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#fff" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Synapses */}
        {synapses.map((syn, i) => {
          const a = nodeMap.get(syn.fromId);
          const b = nodeMap.get(syn.toId);
          if (!a || !b) return null;
          const ax = (a.x * 0.45 + 0.5) * W;
          const ay = (a.y * 0.45 + 0.5) * H;
          const bx = (b.x * 0.45 + 0.5) * W;
          const by = (b.y * 0.45 + 0.5) * H;
          return (
            <g key={i}>
              <line x1={ax} y1={ay} x2={bx} y2={by}
                stroke={CLUSTER_COLORS[a.cluster]} strokeWidth={1 + syn.similarity * 1.5}
                opacity={0.18 + syn.similarity * 0.4}
              />
              <circle r="2" fill="#fff" opacity="0.8">
                <animateMotion path={`M ${ax} ${ay} L ${bx} ${by}`} dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}

        {/* Nœuds */}
        {nodes.map((n) => {
          const cx = (n.x * 0.45 + 0.5) * W;
          const cy = (n.y * 0.45 + 0.5) * H;
          const r = 2 + n.weight * 7;
          const color = CLUSTER_COLORS[n.cluster];
          return (
            <g key={n.id} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={r * 3} fill="url(#nodeGlow)" opacity="0.6" />
              <circle cx={cx} cy={cy} r={r} fill={color}>
                <animate attributeName="r" values={`${r};${r * 1.3};${r}`} dur={`${2 + (n.x * 0.7 + 0.5) * 2}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute left-4 top-4 max-w-md rounded-lg bg-slate-900/95 p-3 text-xs ring-1 ring-slate-700 backdrop-blur">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: CLUSTER_COLORS[hovered.cluster] }} />
            <span className="font-semibold text-slate-200">{hovered.docTitle}</span>
          </div>
          <p className="text-slate-400">"{hovered.preview}…"</p>
        </div>
      )}

      {/* Légende clusters */}
      <div className="absolute bottom-3 right-3 flex gap-1.5">
        {CLUSTER_COLORS.map((c, i) => (
          <span key={i} className="h-3 w-3 rounded-full" style={{ background: c }} title={`Cluster ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

/* ─── TIMELINE 30J ─────────────────────────────────────────────── */

function Timeline({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex h-32 items-end gap-0.5">
        {data.map((d, i) => (
          <div key={i} className="group relative flex-1">
            <div
              className="rounded-t bg-gradient-to-t from-rose-700 to-rose-400 transition-all hover:from-rose-500 hover:to-rose-300"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%` }}
              title={`${d.date} : ${d.count}`}
            />
            {d.count > 0 && (
              <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-100 opacity-0 transition group-hover:opacity-100">
                {d.count}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

/* ─── DISTRO BAR ───────────────────────────────────────────────── */

function DistroBar({ data }: { data: { label: string; count: number; pct: number }[] }) {
  if (data.length === 0) return <div className="text-xs text-slate-500">Aucune donnée</div>;
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-0.5 flex justify-between text-xs">
            <span className="text-slate-300">{d.label}</span>
            <span className="font-mono text-slate-500">{d.count} · {d.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-gradient-to-r from-fuchsia-500 to-rose-500" style={{ width: `${d.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── TAG CLOUD ────────────────────────────────────────────────── */

function TagCloud({ tags }: { tags: { tag: string; count: number }[] }) {
  if (tags.length === 0) return <div className="text-xs text-slate-500">Aucun tag</div>;
  const max = Math.max(...tags.map((t) => t.count), 1);
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const intensity = t.count / max;
        const size = 0.7 + intensity * 0.7;
        return (
          <span
            key={t.tag}
            className="rounded-full px-3 py-1 font-medium ring-1"
            style={{
              fontSize: `${size}rem`,
              background: `rgba(244,63,94,${0.1 + intensity * 0.25})`,
              color: `rgba(255,255,255,${0.7 + intensity * 0.3})`,
              borderColor: `rgba(244,63,94,${0.3 + intensity * 0.4})`,
            }}
          >
            {t.tag} <span className="font-mono text-xs opacity-70">×{t.count}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ─── BLIND SPOTS ──────────────────────────────────────────────── */

function BlindSpots({ items }: { items: { question: string; topScore: number; createdAt: string }[] }) {
  if (items.length === 0) {
    return <div className="rounded-lg bg-emerald-950/40 p-3 text-xs text-emerald-400">✓ Pas de zone aveugle pour l'instant</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((b, i) => (
        <div key={i} className="rounded-lg bg-slate-800 p-2.5 text-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-slate-200">"{b.question}"</p>
            <span className={`flex-shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] ${
              b.topScore < 0.3 ? 'bg-rose-900/60 text-rose-300' :
              b.topScore < 0.5 ? 'bg-amber-900/60 text-amber-300' :
              'bg-emerald-900/60 text-emerald-300'
            }`}>
              {b.topScore.toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">{new Date(b.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── STATS BRUTES ─────────────────────────────────────────────── */

function RawStats({ s, v }: { s: BrainSnapshot['stats']; v: BrainSnapshot['vitals'] }) {
  const items = [
    { label: 'Documents', value: `${s.docsEnabled} / ${s.docs}` },
    { label: 'Chunks', value: s.chunks.toLocaleString() },
    { label: 'Tokens', value: s.tokens.toLocaleString() },
    { label: 'Tags uniques', value: s.tags },
    { label: 'Langues', value: s.locales },
    { label: 'Types source', value: s.sourceTypes },
    { label: 'Taille moy. chunk', value: `${s.avgChunkSize} car.` },
    { label: 'Norme embed.', value: s.avgEmbeddingNorm.toFixed(3) },
    { label: 'Pulsation', value: `${v.pulseHz} Hz` },
    { label: 'Activité', value: `${v.activityLevel}/100` },
    { label: 'Questions en file', value: s.pendingQuestions },
    { label: 'Top score moyen', value: s.avgTopScore.toFixed(3) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg bg-slate-800 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-400">{it.label}</div>
          <div className="mt-1 font-mono text-lg font-semibold text-slate-100">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── CARD WRAPPER ─────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-800">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="text-xl font-bold text-slate-100">
        <span className="mr-2">{icon}</span>{title}
      </h2>
      {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
    </div>
  );
}

/* ─── STARFIELD DE FOND ────────────────────────────────────────── */

function Starfield() {
  const stars = useMemo(() => Array.from({ length: 80 }).map((_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.3,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
  })), []);
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: 0.3,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes twinkle { 0%,100% { opacity: 0.15 } 50% { opacity: 0.7 } }`}</style>
    </div>
  );
}
