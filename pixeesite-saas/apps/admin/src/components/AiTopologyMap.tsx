'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * AiTopologyMap — visualisation live des flux IA (Pixeesite, port iso GLD).
 *
 * Modes :
 *  - flow         : Sankey-style 2D (tâches → providers)
 *  - interactive  : graphe directionnel cliquable filtrable par catégorie
 *  - constellation: orbites radiales
 *  - brain        : pseudo-3D CSS perspective
 *  - stats        : barres latences + distribution
 *
 * Pings live via /api/orgs/[slug]/ai-providers?ping=ID toutes les 30 s.
 */

interface Provider {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  baseUrl?: string;
  apiKeyConfigured?: boolean;
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
  text:           { label: 'Texte',           emoji: '✍️' },
  image:          { label: 'Image',           emoji: '🎨' },
  video:          { label: 'Vidéo',           emoji: '🎬' },
  audio:          { label: 'Audio',           emoji: '🎙️' },
  embed:          { label: 'Embeddings',      emoji: '🧬' },
  moderation:     { label: 'Modération',      emoji: '🛡️' },
  classification: { label: 'Classification',  emoji: '🏷️' },
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini:        '#22d3ee',
  openai:        '#10b981',
  anthropic:     '#f59e0b',
  openrouter:    '#a855f7',
  groq:          '#84cc16',
  mistral:       '#fb923c',
  ollama:        '#10b981',
  'ollama-cloud':'#14b8a6',
  lmstudio:      '#3b82f6',
  fal:           '#ec4899',
  elevenlabs:    '#8b5cf6',
  heygen:        '#f43f5e',
  imagen:        '#06b6d4',
};

function latencyColor(ms?: number): string {
  if (ms == null) return '#71717a';
  if (ms < 200) return '#10b981';
  if (ms < 600) return '#84cc16';
  if (ms < 1500) return '#fbbf24';
  return '#ef4444';
}

const TASK_CATEGORY: Record<string, { category: string; color: string }> = {
  text:           { category: 'text',     color: '#8b5cf6' },
  image:          { category: 'visual',   color: '#10b981' },
  video:          { category: 'visual',   color: '#84cc16' },
  audio:          { category: 'audio',    color: '#f97316' },
  embed:          { category: 'data',     color: '#14b8a6' },
  moderation:     { category: 'moderate', color: '#f59e0b' },
  classification: { category: 'analyze',  color: '#06b6d4' },
};

const CATEGORIES_LABELS: Record<string, { label: string; color: string }> = {
  text:     { label: 'Texte',         color: '#a855f7' },
  moderate: { label: 'Modération',    color: '#f59e0b' },
  analyze:  { label: 'Analyse',       color: '#06b6d4' },
  data:     { label: 'Données/RAG',   color: '#14b8a6' },
  audio:    { label: 'Audio',         color: '#f97316' },
  visual:   { label: 'Visuel',        color: '#10b981' },
};

interface Props {
  orgSlug: string;
  providers: Provider[];
  mappings: Record<string, TaskMapping>;
}

export function AiTopologyMap({ orgSlug, providers, mappings }: Props) {
  const [mode, setMode] = useState<'flow' | 'interactive' | 'constellation' | 'brain' | 'stats'>('flow');
  const [pings, setPings] = useState<Record<string, PingState>>({});
  const [pinging, setPinging] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function pingAll() {
    setPinging(true);
    const results: Record<string, PingState> = {};
    await Promise.all(
      providers.filter((p) => p.enabled).map(async (p) => {
        try {
          const r = await fetch(`/api/orgs/${orgSlug}/ai-providers?ping=${p.id}`);
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
    if (providers.length > 0) pingAll();
    if (!autoRefresh) return;
    const i = setInterval(pingAll, 30_000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, providers.map((p) => p.id + p.enabled).join(',')]);

  const enabledProviders = providers.filter((p) => p.enabled);
  const upCount = Object.values(pings).filter((p) => p.ok).length;
  const avgLatency = (() => {
    const arr = Object.values(pings).map((p) => p.latencyMs).filter((n): n is number => typeof n === 'number');
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((s, n) => s + n, 0) / arr.length);
  })();

  return (
    <section style={{ background: '#18181b', border: '2px solid rgba(217,70,239,0.3)', borderRadius: 16, padding: 16, marginBottom: 16, overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#d946ef,#8b5cf6,#06b6d4)', borderRadius: 12, padding: 10, fontSize: 18 }}>🧠</div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Visual Topology — flux IA en direct</h2>
            <p style={{ fontSize: 11, color: '#71717a', margin: 0 }}>
              {enabledProviders.length} providers actifs · {upCount}/{enabledProviders.length} UP · latence moy. {avgLatency} ms
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 999, padding: 4, gap: 2 }}>
            {[
              { id: 'flow', label: 'Flow' },
              { id: 'interactive', label: 'Interactive' },
              { id: 'constellation', label: 'Constellation' },
              { id: 'brain', label: 'Brain 3D' },
              { id: 'stats', label: 'Stats' },
            ].map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: 0,
                    cursor: 'pointer',
                    background: active ? 'linear-gradient(90deg,#d946ef,#8b5cf6)' : 'transparent',
                    color: active ? 'white' : '#71717a',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#71717a', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto-refresh 30s
          </label>
          <button onClick={pingAll} disabled={pinging} style={{ background: '#27272a', color: '#e4e4e7', padding: '6px 12px', borderRadius: 999, fontSize: 11, border: 0, cursor: 'pointer' }}>
            {pinging ? '⏳ Ping...' : '🔄 Ping'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 10, color: '#a1a1aa', marginBottom: 12 }}>
        <Legend color="#10b981" label="< 200 ms" />
        <Legend color="#84cc16" label="< 600 ms" />
        <Legend color="#fbbf24" label="< 1500 ms" />
        <Legend color="#ef4444" label="> 1500 ms" />
        <Legend color="#71717a" label="non testé" />
      </div>

      {mode === 'flow' && <FlowMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'interactive' && <InteractiveMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'constellation' && <ConstellationMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'brain' && <BrainMode providers={providers} mappings={mappings} pings={pings} />}
      {mode === 'stats' && <StatsMode providers={providers} mappings={mappings} pings={pings} />}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', display: 'inline-block', background: color }} />
      <span>{label}</span>
    </div>
  );
}

// ── Flow ──────────────────────────────────────────────────────────
function FlowMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const tasks = Object.keys(TASK_LABELS);
  const enabledProviders = providers.filter((p) => p.enabled);
  const W = 900;
  const H = Math.max(380, tasks.length * 50 + 40);
  const taskX = 180, providerX = 720;
  const taskY = (i: number) => 30 + i * (H - 60) / Math.max(1, tasks.length - 1);
  const provY = (i: number) => 30 + i * (H - 60) / Math.max(1, enabledProviders.length - 1);

  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 600 }}>
        {tasks.map((taskKey, ti) => {
          const m = mappings[taskKey];
          if (!m) return null;
          const provIdx = enabledProviders.findIndex((p) => p.id === m.primary.providerId);
          if (provIdx === -1) return null;
          const p = enabledProviders[provIdx];
          const ping = pings[p.id];
          const stroke = p.enabled ? latencyColor(ping?.latencyMs) : '#3f3f46';
          const x1 = taskX + 80, y1 = taskY(ti);
          const x2 = providerX - 80, y2 = provY(provIdx);
          const cx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
          return (
            <g key={taskKey}>
              <path d={d} fill="none" stroke={stroke} strokeWidth="2" opacity={ping?.ok ? 1 : 0.3} />
              {ping?.ok && (
                <circle r="4" fill={stroke}>
                  <animateMotion dur="3s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}

        {tasks.map((taskKey, i) => {
          const info = TASK_LABELS[taskKey];
          return (
            <g key={taskKey} transform={`translate(${taskX - 80}, ${taskY(i) - 11})`}>
              <rect width="160" height="22" rx="11" fill="#18181b" stroke="#27272a" />
              <text x="14" y="15" fill="#fafafa" fontSize="11" fontWeight="600">{info.emoji} {info.label}</text>
            </g>
          );
        })}

        {enabledProviders.map((p, i) => {
          const ping = pings[p.id];
          const c = PROVIDER_COLORS[p.type] || '#a855f7';
          return (
            <g key={p.id} transform={`translate(${providerX - 80}, ${provY(i) - 14})`}>
              <rect width="170" height="28" rx="14" fill="#18181b" stroke={c} strokeWidth="1.5" />
              <circle cx="14" cy="14" r="4" fill={ping?.ok ? '#10b981' : ping?.error ? '#ef4444' : '#71717a'}>
                {ping?.ok && <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />}
              </circle>
              <text x="26" y="13" fill={c} fontSize="10" fontWeight="700">{p.label.slice(0, 22)}</text>
              <text x="26" y="24" fill="#a1a1aa" fontSize="9">{ping?.latencyMs != null ? `${ping.latencyMs}ms` : ping?.error || '—'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Interactive ─────────────────────────────────────────────────
function InteractiveMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const tasks = Object.keys(TASK_LABELS);
  const enabledProviders = providers.filter((p) => p.enabled);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES_LABELS)));

  function toggleCat(cat: string) {
    setActiveCategories((prev) => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
      return n;
    });
  }

  const W = 1000, padding = 30, taskX = 220, providerX = 780;
  const tasksByCat = Object.entries(TASK_CATEGORY).reduce<Record<string, string[]>>((acc, [k, info]) => {
    (acc[info.category] = acc[info.category] || []).push(k);
    return acc;
  }, {});
  const orderedCats = Object.keys(CATEGORIES_LABELS).filter((c) => tasksByCat[c]?.length);
  const taskPositions: Record<string, number> = {};
  let cursorY = padding;
  orderedCats.forEach((cat) => {
    cursorY += 12;
    tasksByCat[cat].forEach((tk) => { taskPositions[tk] = cursorY; cursorY += 32; });
  });
  const totalH = cursorY + padding;
  const providerStep = (totalH - 2 * padding) / Math.max(1, enabledProviders.length - 1);
  const providerY = (i: number) => padding + i * providerStep;

  function isTaskVisible(t: string) {
    if (!activeCategories.has(TASK_CATEGORY[t].category)) return false;
    if (selectedProvider) {
      const m = mappings[t];
      return m?.primary.providerId === selectedProvider || m?.fallback.some((f) => f.providerId === selectedProvider);
    }
    if (selectedTask) return t === selectedTask;
    return true;
  }
  function isProviderVisible(pid: string) {
    if (selectedTask) {
      const m = mappings[selectedTask];
      return m?.primary.providerId === pid || m?.fallback.some((f) => f.providerId === pid);
    }
    return true;
  }

  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid #27272a', padding: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, color: '#71717a', letterSpacing: 1.5 }}>Catégories :</span>
        {Object.entries(CATEGORIES_LABELS).map(([cat, info]) => {
          const active = activeCategories.has(cat);
          return (
            <button key={cat} onClick={() => toggleCat(cat)} style={{
              fontSize: 11, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
              background: active ? `${info.color}30` : 'transparent', borderWidth: 1, borderStyle: 'solid',
              borderColor: active ? info.color : '#3f3f46', color: active ? info.color : '#71717a',
            }}>
              {info.label}
            </button>
          );
        })}
        {(selectedTask || selectedProvider) && (
          <button onClick={() => { setSelectedTask(null); setSelectedProvider(null); }} style={{ marginLeft: 'auto', fontSize: 10, background: '#27272a', color: '#e4e4e7', padding: '6px 12px', borderRadius: 999, border: 0, cursor: 'pointer' }}>
            ✕ Réinit
          </button>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${totalH}`} style={{ width: '100%', height: 'auto', maxHeight: 700 }}>
        <defs>
          {Object.entries(CATEGORIES_LABELS).map(([cat, info]) => (
            <marker key={cat} id={`arrow-${cat}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={info.color} />
            </marker>
          ))}
          <marker id="arrow-highlight" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
          </marker>
        </defs>

        {tasks.map((tk) => {
          if (!isTaskVisible(tk)) return null;
          const m = mappings[tk];
          if (!m) return null;
          const provIdx = enabledProviders.findIndex((p) => p.id === m.primary.providerId);
          if (provIdx === -1 || !isProviderVisible(m.primary.providerId)) return null;
          const cat = TASK_CATEGORY[tk].category;
          const isHi = selectedTask === tk || selectedProvider === m.primary.providerId;
          const x1 = taskX + 90, y1 = taskPositions[tk];
          const x2 = providerX - 95, y2 = providerY(provIdx);
          const cx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
          const stroke = isHi ? '#fbbf24' : CATEGORIES_LABELS[cat].color;
          const arrowId = isHi ? 'arrow-highlight' : `arrow-${cat}`;
          return <path key={tk} d={d} fill="none" stroke={stroke} strokeWidth={isHi ? 3 : 2} opacity={isHi ? 1 : 0.7} markerEnd={`url(#${arrowId})`} />;
        })}

        {tasks.map((tk) => {
          const info = TASK_LABELS[tk];
          const cat = TASK_CATEGORY[tk];
          const visible = isTaskVisible(tk);
          const isSelected = selectedTask === tk;
          return (
            <g key={tk} transform={`translate(${taskX - 90}, ${taskPositions[tk] - 13})`} style={{ cursor: 'pointer', opacity: visible ? 1 : 0.2 }} onClick={() => setSelectedTask(isSelected ? null : tk)}>
              <rect width="180" height="26" rx="13" fill={isSelected ? cat.color : '#18181b'} stroke={cat.color} strokeWidth={isSelected ? 2 : 1} />
              <text x="14" y="17" fill={isSelected ? '#0a0a0f' : '#fafafa'} fontSize="11" fontWeight="600">{info.emoji} {info.label}</text>
            </g>
          );
        })}

        {enabledProviders.map((p, i) => {
          const ping = pings[p.id];
          const c = PROVIDER_COLORS[p.type] || '#a855f7';
          const visible = isProviderVisible(p.id);
          const isSelected = selectedProvider === p.id;
          return (
            <g key={p.id} transform={`translate(${providerX - 95}, ${providerY(i) - 16})`} style={{ cursor: 'pointer', opacity: visible ? 1 : 0.25 }} onClick={() => setSelectedProvider(isSelected ? null : p.id)}>
              <rect width="190" height="32" rx="16" fill={isSelected ? c : '#18181b'} stroke={c} strokeWidth={isSelected ? 2 : 1.5} />
              <circle cx="14" cy="16" r="5" fill={ping?.ok ? '#10b981' : ping?.error ? '#ef4444' : '#71717a'}>
                {ping?.ok && <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />}
              </circle>
              <text x="26" y="14" fill={isSelected ? '#0a0a0f' : c} fontSize="11" fontWeight="700">{p.label.length > 22 ? p.label.slice(0, 21) + '…' : p.label}</text>
              <text x="26" y="26" fill={isSelected ? '#0a0a0f99' : '#a1a1aa'} fontSize="9">{ping?.latencyMs != null ? `${ping.latencyMs}ms · ${ping.models?.length || 0} mod.` : ping?.error || 'non testé'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Constellation ──────────────────────────────────────────────
function ConstellationMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const tasks = Object.keys(TASK_LABELS);
  const enabledProviders = providers.filter((p) => p.enabled);
  const W = 720, H = 720, cx = W / 2, cy = H / 2;
  const taskRadius = 180, providerRadius = 310;

  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxHeight: 600 }}>
        <defs>
          <radialGradient id="core-grad">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r="80" fill="url(#core-grad)" />
        <circle cx={cx} cy={cy} r="40" fill="#a855f7" opacity="0.2">
          <animate attributeName="r" values="35;50;35" dur="3s" repeatCount="indefinite" />
        </circle>
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#fafafa" fontSize="12" fontWeight="700">Pixee AI</text>

        {tasks.map((tk, ti) => {
          const m = mappings[tk];
          if (!m) return null;
          const provIdx = enabledProviders.findIndex((p) => p.id === m.primary.providerId);
          if (provIdx === -1) return null;
          const p = enabledProviders[provIdx];
          const ping = pings[p.id];
          const taskAngle = (ti / tasks.length) * 2 * Math.PI - Math.PI / 2;
          const provAngle = (provIdx / enabledProviders.length) * 2 * Math.PI - Math.PI / 2;
          const tx = cx + Math.cos(taskAngle) * taskRadius;
          const ty = cy + Math.sin(taskAngle) * taskRadius;
          const px = cx + Math.cos(provAngle) * providerRadius;
          const py = cy + Math.sin(provAngle) * providerRadius;
          const stroke = latencyColor(ping?.latencyMs);
          const d = `M ${tx} ${ty} Q ${cx} ${cy}, ${px} ${py}`;
          return (
            <g key={tk}>
              <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" opacity={ping?.ok ? 0.7 : 0.2} />
              {ping?.ok && <circle r="3" fill={stroke}><animateMotion dur="4s" repeatCount="indefinite" path={d} /></circle>}
            </g>
          );
        })}

        {tasks.map((tk, ti) => {
          const angle = (ti / tasks.length) * 2 * Math.PI - Math.PI / 2;
          const x = cx + Math.cos(angle) * taskRadius;
          const y = cy + Math.sin(angle) * taskRadius;
          return (
            <g key={tk} transform={`translate(${x},${y})`}>
              <circle r="14" fill="#18181b" stroke="#a855f7" strokeWidth="1.5" />
              <text textAnchor="middle" y="5" fontSize="14">{TASK_LABELS[tk].emoji}</text>
              <text textAnchor="middle" y="32" fontSize="9" fill="#a1a1aa">{TASK_LABELS[tk].label}</text>
            </g>
          );
        })}

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
              <text textAnchor="middle" y="5" fontSize="10" fontWeight="700" fill={c}>{p.id.slice(0, 10)}</text>
              <text textAnchor="middle" y="40" fontSize="9" fill="#a1a1aa">{ping?.latencyMs != null ? `${ping.latencyMs}ms` : '—'}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Brain pseudo-3D ───────────────────────────────────────────
function BrainMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const enabledProviders = providers.filter((p) => p.enabled);
  const tasks = Object.keys(TASK_LABELS);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ background: 'linear-gradient(135deg,#0a0a0f,#1e1b4b22,#0a0a0f)', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden', position: 'relative', height: 540 }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '900px' }}>
        <div style={{ position: 'relative', width: 320, height: 320, transformStyle: 'preserve-3d', animation: 'brain-rotate 30s linear infinite' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg,#d946ef,#8b5cf6,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700,
            boxShadow: '0 0 60px rgba(217,70,239,0.5)',
          }}>Pixee AI</div>

          {tasks.map((tk, i) => {
            const angle = (i / tasks.length) * 2 * Math.PI;
            const r = 90;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
            const z = Math.sin(i * 0.7) * 60;
            return (
              <div key={tk} style={{
                position: 'absolute', top: '50%', left: '50%', fontSize: 24,
                transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`,
                textShadow: '0 0 12px rgba(168,85,247,0.6)',
              }} title={TASK_LABELS[tk].label}>{TASK_LABELS[tk].emoji}</div>
            );
          })}

          {enabledProviders.map((p, i) => {
            const angle = (i / enabledProviders.length) * 2 * Math.PI;
            const r = 150;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle * 1.3) * r * 0.6;
            const z = Math.cos(i * 1.1) * 100;
            const c = PROVIDER_COLORS[p.type] || '#a855f7';
            const ping = pings[p.id];
            return (
              <div key={p.id} style={{
                position: 'absolute', top: '50%', left: '50%', borderRadius: 999,
                padding: '4px 12px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px)`,
                background: `${c}30`, color: c, border: `1.5px solid ${c}`,
                boxShadow: ping?.ok ? `0 0 20px ${c}60` : 'none',
              }}>
                {p.label.split(' ')[0]}{ping?.latencyMs != null && ` · ${ping.latencyMs}ms`}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#71717a', fontStyle: 'italic' }}>
        Vue cerveau 3D — la sphère tourne. Effet CSS perspective.
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

// ── Stats ──────────────────────────────────────────────
function StatsMode({ providers, mappings, pings }: { providers: Provider[]; mappings: Record<string, TaskMapping>; pings: Record<string, PingState> }) {
  const enabledProviders = providers.filter((p) => p.enabled);
  const maxLatency = Math.max(...enabledProviders.map((p) => pings[p.id]?.latencyMs || 0), 100);
  const taskCount: Record<string, number> = {};
  Object.values(mappings).forEach((m) => {
    taskCount[m.primary.providerId] = (taskCount[m.primary.providerId] || 0) + 1;
  });

  return (
    <div style={{ background: '#0a0a0f', border: '1px solid #27272a', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: '#10b981', letterSpacing: 1.5, marginBottom: 12 }}>Latence par provider</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {enabledProviders.map((p) => {
              const ping = pings[p.id];
              const ms = ping?.latencyMs;
              const c = PROVIDER_COLORS[p.type] || '#a855f7';
              const pct = ms != null ? Math.min(100, (ms / maxLatency) * 100) : 0;
              return (
                <div key={p.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: c }}>{p.label}</span>
                    <span style={{ color: ping?.ok ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                      {ms != null ? `${ms}ms` : ping?.error || '—'}
                    </span>
                  </div>
                  <div style={{ background: '#18181b', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ms != null ? latencyColor(ms) : '#3f3f46', transition: 'width .3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: '#d946ef', letterSpacing: 1.5, marginBottom: 12 }}>Features assignées (primaire)</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(taskCount).sort((a, b) => b[1] - a[1]).map(([pid, count]) => {
              const p = providers.find((x) => x.id === pid);
              const c = p ? PROVIDER_COLORS[p.type] || '#a855f7' : '#71717a';
              const pct = (count / Math.max(1, Object.keys(mappings).length)) * 100;
              return (
                <div key={pid}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: c }}>{p?.label || pid}</span>
                    <span style={{ color: '#a1a1aa' }}>{count} feature{count > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ background: '#18181b', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #27272a', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <KPI label="Providers UP" value={`${Object.values(pings).filter((p) => p.ok).length}/${enabledProviders.length}`} color="#10b981" />
        <KPI label="Latence moyenne" value={`${Math.round(Object.values(pings).filter((p) => p.ok).reduce((s, p) => s + (p.latencyMs || 0), 0) / Math.max(1, Object.values(pings).filter((p) => p.ok).length))} ms`} color="#22d3ee" />
        <KPI label="Features mappées" value={`${Object.keys(mappings).length}/${Object.keys(TASK_LABELS).length}`} color="#a855f7" />
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#71717a', marginTop: 4 }}>{label}</div>
    </div>
  );
}
