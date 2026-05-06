'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Zap, Brain as BrainIcon, BarChart3, Network, RefreshCw, Sparkles, Cpu, Cloud } from 'lucide-react';

/**
 * AiTopologyMap — visualisation live des flux IA.
 *
 * 4 modes :
 *  - flow         : Sankey-style flat 2D (tâches → providers, lignes colorées par latence)
 *  - constellation: radial, providers en orbite autour des tâches
 *  - brain        : pseudo-3D (CSS transform), providers comme synapses
 *  - stats        : graphiques barres latences + usage
 *
 * Données live :
 *  - Ping de chaque provider toutes les 30 s (status + latence + modèles dispo)
 *  - Animation de pulses sur les liens actifs
 */

interface Provider {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  baseUrl?: string;
  apiKey?: string;
}

interface TaskMapping {
  taskKey: string;
  primary: { providerId: string; model: string };
  fallback: { providerId: string; model: string }[];
}

interface PingState {
  ok: boolean;
  latencyMs?: number;
  error?: string;
  models?: string[];
  pingedAt: number;
}

const TASK_LABELS: Record<string, { label: string; emoji: string }> = {
  'text-short':        { label: 'Texte court',     emoji: '⚡' },
  'text-medium':       { label: 'Texte moyen',     emoji: '📝' },
  'text-long':         { label: 'Texte long',      emoji: '📚' },
  'moderation':        { label: 'Modération',      emoji: '🛡️' },
  'classify-venue':    { label: 'Classify venue',  emoji: '🏛️' },
  'enrich-venue':      { label: 'Enrich venue',    emoji: '🔍' },
  'persona-companion': { label: 'Compagnon IA',    emoji: '✨' },
  'rag-chat':          { label: 'RAG chat',        emoji: '💬' },
  'embeddings':        { label: 'Embeddings',      emoji: '🧬' },
  'stt':               { label: 'STT',             emoji: '🎙️' },
  'image-generate':    { label: 'Image',           emoji: '🎨' },
  'video-generate':    { label: 'Vidéo',           emoji: '🎬' },
  'avatar-realtime':   { label: 'Avatar',          emoji: '🎭' }
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini:          '#22d3ee',
  ollama:          '#10b981',
  'ollama-cloud':  '#14b8a6',
  lmstudio:        '#3b82f6',
  llamacpp:        '#a855f7',
  openrouter:      '#f59e0b',
  fal:             '#ec4899',
  heygen:          '#f43f5e',
  comfyui:         '#8b5cf6',
  'whisper-local': '#f97316'
};

function latencyColor(ms?: number): string {
  if (ms == null) return '#71717a';
  if (ms < 200) return '#10b981';   // green
  if (ms < 600) return '#84cc16';   // lime
  if (ms < 1500) return '#fbbf24';  // amber
  return '#ef4444';                 // red
}

interface Props {
  providers: Provider[];
  mappings: Record<string, TaskMapping>;
}

export function AiTopologyMap({ providers, mappings }: Props) {
  const [mode, setMode] = useState<'flow' | 'constellation' | 'brain' | 'stats'>('flow');
  const [pings, setPings] = useState<Record<string, PingState>>({});
  const [pinging, setPinging] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function pingAll() {
    setPinging(true);
    const results: Record<string, PingState> = {};
    await Promise.all(
      providers.filter(p => p.enabled).map(async (p) => {
        try {
          const r = await fetch(`/api/admin/ai-providers?ping=${p.id}`);
          const j = await r.json();
          results[p.id] = { ...j, pingedAt: Date.now() };
        } catch (e: any) {
          results[p.id] = { ok: false, error: e?.message, pingedAt: Date.now() };
        }
      })
    );
    setPings(results);
    setPinging(false);
  }

  useEffect(() => {
    pingAll();
    if (!autoRefresh) return;
    const i = setInterval(pingAll, 30_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, providers.map(p => p.id + p.enabled).join(',')]);

  const enabledProviders = providers.filter(p => p.enabled);
  const upCount = Object.values(pings).filter(p => p.ok).length;
  const avgLatency = (() => {
    const arr = Object.values(pings).map(p => p.latencyMs).filter((n): n is number => typeof n === 'number');
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((s, n) => s + n, 0) / arr.length);
  })();

  return (
    <section className="bg-zinc-900 border-2 border-fuchsia-500/30 rounded-2xl p-4 mb-4 overflow-hidden">
      <header className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 rounded-xl p-2.5">
            <Network size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base">Visual Topology — flux IA en direct</h2>
            <p className="text-[11px] text-zinc-500">
              {enabledProviders.length} providers actifs · {upCount}/{enabledProviders.length} UP · latence moy. {avgLatency} ms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Modes */}
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-full p-1 gap-0.5">
            {[
              { id: 'flow',          icon: Zap,        label: 'Flow' },
              { id: 'constellation', icon: Sparkles,   label: 'Constellation' },
              { id: 'brain',         icon: BrainIcon,  label: 'Brain' },
              { id: 'stats',         icon: BarChart3,  label: 'Stats' }
            ].map(m => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition ${
                    active ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Icon size={11} /> {m.label}
                </button>
              );
            })}
          </div>
          {/* Auto-refresh */}
          <label className="flex items-center gap-1.5 text-[10px] text-zinc-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="accent-fuchsia-500" />
            Auto-refresh 30s
          </label>
          <button
            onClick={pingAll}
            disabled={pinging}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <RefreshCw size={11} className={pinging ? 'animate-spin' : ''} /> Ping
          </button>
        </div>
      </header>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400 mb-3">
        <Legend color="#10b981" label="< 200 ms" />
        <Legend color="#84cc16" label="< 600 ms" />
        <Legend color="#fbbf24" label="< 1500 ms" />
        <Legend color="#ef4444" label="> 1500 ms" />
        <Legend color="#71717a" label="non testé" />
        <Legend color="#3f3f46" label="désactivé" />
      </div>

      {/* Le rendu change selon le mode */}
      {mode === 'flow' && <FlowMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'constellation' && <ConstellationMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'brain' && <BrainMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'stats' && <StatsMode providers={providers} mappings={mappings} pings={pings} />}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODE 1 — Flow (Sankey-style)
   ───────────────────────────────────────────── */
function FlowMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const tasks = Object.keys(TASK_LABELS);
  const enabledProviders = providers.filter(p => p.enabled);

  const W = 900;
  const H = Math.max(420, tasks.length * 28 + 40);
  const taskX = 180;
  const providerX = 720;

  // Position chaque tâche / provider verticalement
  const taskY = (i: number) => 30 + i * (H - 60) / Math.max(1, tasks.length - 1);
  const provY = (i: number) => 30 + i * (H - 60) / Math.max(1, enabledProviders.length - 1);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 600 }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" /></filter>
          <linearGradient id="grad-edge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Edges primaires */}
        {tasks.map((taskKey, ti) => {
          const m = mappings[taskKey];
          if (!m) return null;
          const provIdx = enabledProviders.findIndex(p => p.id === m.primary.providerId);
          if (provIdx === -1) return null;
          const p = enabledProviders[provIdx];
          const ping = pings[p.id];
          const stroke = p.enabled ? latencyColor(ping?.latencyMs) : '#3f3f46';
          const opacity = ping?.ok ? 1 : 0.3;
          const x1 = taskX + 80;
          const y1 = taskY(ti);
          const x2 = providerX - 80;
          const y2 = provY(provIdx);
          const cx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
          return (
            <g key={taskKey}>
              <path d={d} fill="none" stroke={stroke} strokeWidth="2" opacity={opacity} />
              {ping?.ok && (
                <circle r="4" fill={stroke}>
                  <animateMotion dur="3s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Edges fallback (en pointillé) */}
        {tasks.map((taskKey, ti) => {
          const m = mappings[taskKey];
          if (!m) return null;
          return m.fallback.slice(0, 1).map((fb, fi) => {
            const provIdx = enabledProviders.findIndex(p => p.id === fb.providerId);
            if (provIdx === -1) return null;
            const ping = pings[fb.providerId];
            const stroke = ping?.ok ? '#71717a' : '#3f3f46';
            const x1 = taskX + 80;
            const y1 = taskY(ti);
            const x2 = providerX - 80;
            const y2 = provY(provIdx);
            const cx = (x1 + x2) / 2;
            return (
              <path
                key={`${taskKey}-fb-${fi}`}
                d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth="1"
                strokeDasharray="3 4"
                opacity="0.4"
              />
            );
          });
        })}

        {/* Tâches (colonne gauche) */}
        {tasks.map((taskKey, i) => {
          const info = TASK_LABELS[taskKey];
          return (
            <g key={taskKey} transform={`translate(${taskX - 80}, ${taskY(i) - 11})`}>
              <rect x="0" y="0" width="160" height="22" rx="11" fill="#18181b" stroke="#27272a" />
              <text x="14" y="15" fill="#fafafa" fontSize="11" fontWeight="600">
                {info.emoji} {info.label}
              </text>
            </g>
          );
        })}

        {/* Providers (colonne droite) */}
        {enabledProviders.map((p, i) => {
          const ping = pings[p.id];
          const c = PROVIDER_COLORS[p.type] || '#a855f7';
          return (
            <g key={p.id} transform={`translate(${providerX - 80}, ${provY(i) - 14})`}>
              <rect x="0" y="0" width="170" height="28" rx="14" fill="#18181b" stroke={c} strokeWidth="1.5" />
              <circle cx="14" cy="14" r="4" fill={ping?.ok ? '#10b981' : (ping?.error ? '#ef4444' : '#71717a')}>
                {ping?.ok && (
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
              <text x="26" y="13" fill={c} fontSize="10" fontWeight="700">{p.label.slice(0, 22)}</text>
              <text x="26" y="24" fill="#a1a1aa" fontSize="9">
                {ping?.latencyMs != null ? `${ping.latencyMs}ms` : (ping?.error || '— pas testé')}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="text-[10px] text-zinc-500 px-3 pb-2">
        ━ ligne pleine = primaire · ┄ pointillée = fallback · ● pulse = traffic actif simulé · couleur = latence
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODE 2 — Constellation (radial)
   ───────────────────────────────────────────── */
function ConstellationMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const tasks = Object.keys(TASK_LABELS);
  const enabledProviders = providers.filter(p => p.enabled);

  const W = 720, H = 720;
  const cx = W / 2, cy = H / 2;
  const taskRadius = 180;       // tâches en cercle intérieur
  const providerRadius = 310;   // providers en cercle extérieur

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: 600 }}>
        <defs>
          <radialGradient id="core-grad">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Halo central */}
        <circle cx={cx} cy={cy} r="80" fill="url(#core-grad)" />
        <circle cx={cx} cy={cy} r="40" fill="#a855f7" opacity="0.2">
          <animate attributeName="r" values="35;50;35" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700">GLD AI</text>

        {/* Liens task → provider primaire */}
        {tasks.map((taskKey, ti) => {
          const m = mappings[taskKey];
          if (!m) return null;
          const provIdx = enabledProviders.findIndex(p => p.id === m.primary.providerId);
          if (provIdx === -1) return null;
          const p = enabledProviders[provIdx];
          const ping = pings[p.id];

          const taskAngle = (ti / tasks.length) * 2 * Math.PI - Math.PI / 2;
          const provAngle = (provIdx / enabledProviders.length) * 2 * Math.PI - Math.PI / 2;
          const tx = cx + Math.cos(taskAngle) * taskRadius;
          const ty = cy + Math.sin(taskAngle) * taskRadius;
          const px = cx + Math.cos(provAngle) * providerRadius;
          const py = cy + Math.sin(provAngle) * providerRadius;

          const stroke = p.enabled ? latencyColor(ping?.latencyMs) : '#3f3f46';
          const d = `M ${tx} ${ty} Q ${cx} ${cy}, ${px} ${py}`;

          return (
            <g key={taskKey}>
              <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" opacity={ping?.ok ? 0.7 : 0.2} />
              {ping?.ok && (
                <circle r="3" fill={stroke}>
                  <animateMotion dur="4s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {/* Tâches en orbite intérieure */}
        {tasks.map((taskKey, ti) => {
          const angle = (ti / tasks.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + Math.cos(angle) * taskRadius;
          const y = cy + Math.sin(angle) * taskRadius;
          return (
            <g key={taskKey} transform={`translate(${x},${y})`}>
              <circle r="14" fill="#18181b" stroke="#a855f7" strokeWidth="1.5" />
              <text textAnchor="middle" y="5" fontSize="14">{TASK_LABELS[taskKey].emoji}</text>
              <text textAnchor="middle" y="32" fontSize="9" fill="#a1a1aa">{TASK_LABELS[taskKey].label}</text>
            </g>
          );
        })}

        {/* Providers en orbite extérieure */}
        {enabledProviders.map((p, i) => {
          const angle = (i / enabledProviders.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + Math.cos(angle) * providerRadius;
          const y = cy + Math.sin(angle) * providerRadius;
          const c = PROVIDER_COLORS[p.type] || '#a855f7';
          const ping = pings[p.id];
          return (
            <g key={p.id} transform={`translate(${x},${y})`}>
              <circle r="22" fill="#0a0a0f" stroke={c} strokeWidth="2" opacity={ping?.ok ? 1 : 0.4} />
              {ping?.ok && (
                <circle r="22" fill="none" stroke={c} strokeWidth="2" opacity="0.6">
                  <animate attributeName="r" values="22;30;22" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              <text textAnchor="middle" y="5" fontSize="10" fontWeight="700" fill={c}>{p.id.slice(0, 8)}</text>
              <text textAnchor="middle" y="40" fontSize="9" fill="#a1a1aa">{ping?.latencyMs != null ? `${ping.latencyMs}ms` : '—'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODE 3 — Brain pseudo-3D (CSS perspective)
   ───────────────────────────────────────────── */
function BrainMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const enabledProviders = providers.filter(p => p.enabled);
  const tasks = Object.keys(TASK_LABELS);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-gradient-to-br from-zinc-950 via-violet-950/20 to-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative" style={{ height: 540 }}>
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: '900px' }}
      >
        <div
          className="relative"
          style={{
            width: 320, height: 320,
            transformStyle: 'preserve-3d',
            animation: 'brain-rotate 30s linear infinite'
          }}
        >
          {/* Centre — core */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold shadow-2xl shadow-fuchsia-500/50"
            style={{ transform: 'translate(-50%, -50%) translateZ(0)' }}
          >
            GLD AI
            <span className="absolute inset-0 rounded-full animate-ping bg-fuchsia-500/30"></span>
          </div>

          {/* Tâches en sphère intérieure (Z aléatoire) */}
          {tasks.map((taskKey, i) => {
            const angle = (i / tasks.length) * 2 * Math.PI;
            const r = 90;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            const z = Math.sin(i * 0.7) * 60;
            return (
              <div
                key={taskKey}
                className="absolute top-1/2 left-1/2 text-2xl"
                style={{
                  transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`,
                  textShadow: '0 0 12px rgba(168, 85, 247, 0.6)'
                }}
                title={TASK_LABELS[taskKey].label}
              >
                {TASK_LABELS[taskKey].emoji}
              </div>
            );
          })}

          {/* Providers en sphère extérieure */}
          {enabledProviders.map((p, i) => {
            const angle = (i / enabledProviders.length) * 2 * Math.PI;
            const r = 150;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle * 1.3) * r * 0.6;
            const z = Math.cos(i * 1.1) * 100;
            const c = PROVIDER_COLORS[p.type] || '#a855f7';
            const ping = pings[p.id];
            return (
              <div
                key={p.id}
                className="absolute top-1/2 left-1/2 rounded-full px-3 py-1 text-[10px] font-bold whitespace-nowrap shadow-lg"
                style={{
                  transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`,
                  background: `${c}30`,
                  color: c,
                  border: `1.5px solid ${c}`,
                  boxShadow: ping?.ok ? `0 0 20px ${c}60` : 'none'
                }}
              >
                {p.label.split(' ')[0]}
                {ping?.latencyMs != null && <span className="ml-1.5 opacity-70">{ping.latencyMs}ms</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 italic">
        🧠 Vue cerveau — la sphère tourne. Bouge ta souris (effet 3D CSS, plus joli plein écran).
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes brain-rotate {
          0%   { transform: rotateY(0deg) rotateX(15deg); }
          50%  { transform: rotateY(180deg) rotateX(-10deg); }
          100% { transform: rotateY(360deg) rotateX(15deg); }
        }
      `}} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MODE 4 — Stats (bar chart latences)
   ───────────────────────────────────────────── */
function StatsMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const enabledProviders = providers.filter(p => p.enabled);
  const maxLatency = Math.max(...enabledProviders.map(p => pings[p.id]?.latencyMs || 0), 100);

  // Compter les tâches par provider primaire
  const taskCount: Record<string, number> = {};
  Object.values(mappings).forEach(m => {
    taskCount[m.primary.providerId] = (taskCount[m.primary.providerId] || 0) + 1;
  });

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Latence par provider */}
        <div>
          <h3 className="text-xs uppercase font-bold text-emerald-400 tracking-widest mb-3">Latence par provider</h3>
          <div className="space-y-2">
            {enabledProviders.map(p => {
              const ping = pings[p.id];
              const ms = ping?.latencyMs;
              const c = PROVIDER_COLORS[p.type] || '#a855f7';
              const pct = ms != null ? Math.min(100, (ms / maxLatency) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold" style={{ color: c }}>{p.label}</span>
                    <span className={ping?.ok ? 'text-emerald-400 font-bold' : 'text-rose-400'}>
                      {ms != null ? `${ms}ms` : (ping?.error || '—')}
                    </span>
                  </div>
                  <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: ms != null ? latencyColor(ms) : '#3f3f46'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distribution tâches → provider */}
        <div>
          <h3 className="text-xs uppercase font-bold text-fuchsia-400 tracking-widest mb-3">Tâches assignées (primaire)</h3>
          <div className="space-y-2">
            {Object.entries(taskCount)
              .sort((a, b) => b[1] - a[1])
              .map(([providerId, count]) => {
                const p = providers.find(x => x.id === providerId);
                const c = p ? (PROVIDER_COLORS[p.type] || '#a855f7') : '#71717a';
                const pct = (count / Object.keys(mappings).length) * 100;
                return (
                  <div key={providerId}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold" style={{ color: c }}>{p?.label || providerId}</span>
                      <span className="text-zinc-400">{count} tâche{count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: c }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* État global */}
      <div className="mt-5 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3">
        <KPI label="Providers UP" value={`${Object.values(pings).filter(p => p.ok).length}/${enabledProviders.length}`} color="#10b981" />
        <KPI label="Latence moyenne" value={`${Math.round(Object.values(pings).filter(p => p.ok).reduce((s, p) => s + (p.latencyMs || 0), 0) / Math.max(1, Object.values(pings).filter(p => p.ok).length))} ms`} color="#22d3ee" />
        <KPI label="Tâches mappées" value={`${Object.keys(mappings).length}/13`} color="#a855f7" />
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-[10px] uppercase text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
