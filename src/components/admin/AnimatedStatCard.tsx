'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Carte stat avec animations vivantes :
 *  - Count-up du nombre au mount
 *  - Sparkline de l'historique (mini graphique linéaire SVG)
 *  - Heat indicator (gradient pulsant si trend up)
 *  - Particules flottantes en fond (subtil)
 *  - Hover : scale + glow
 *
 * Usage minimal :
 *   <AnimatedStatCard label="Vues" value={488} sparkline={[40, 50, 30, 60, 80, 100, 120]} trend="up" color="emerald" href="/admin/analytics" />
 */

export interface AnimatedStatCardProps {
  label: string;
  value: number | string;
  sparkline?: number[];
  trend?: 'up' | 'down' | 'flat';
  color?: 'emerald' | 'sky' | 'fuchsia' | 'amber' | 'rose' | 'violet' | 'cyan' | 'zinc';
  icon?: React.ReactNode;
  emoji?: string;
  href?: string;
  sub?: string;
  unit?: string;        // "€" "%" "j" — affiché collé au nombre
  delta?: number;       // variation depuis période N-1 (pour afficher +12% / -3%)
  liveIndicator?: boolean; // dot pulsant si data live
  onClick?: () => void;
}

const COLOR_MAP: Record<string, { gradient: string; ring: string; text: string; sparkStroke: string; bg: string }> = {
  emerald: { gradient: 'from-emerald-500/20 to-emerald-500/5',  ring: 'ring-emerald-500/30',  text: 'text-emerald-300', sparkStroke: '#10b981', bg: 'bg-emerald-500' },
  sky:     { gradient: 'from-sky-500/20 to-sky-500/5',          ring: 'ring-sky-500/30',      text: 'text-sky-300',     sparkStroke: '#0ea5e9', bg: 'bg-sky-500' },
  fuchsia: { gradient: 'from-fuchsia-500/20 to-fuchsia-500/5',  ring: 'ring-fuchsia-500/30',  text: 'text-fuchsia-300', sparkStroke: '#d946ef', bg: 'bg-fuchsia-500' },
  amber:   { gradient: 'from-amber-500/20 to-amber-500/5',      ring: 'ring-amber-500/30',    text: 'text-amber-300',   sparkStroke: '#f59e0b', bg: 'bg-amber-500' },
  rose:    { gradient: 'from-rose-500/20 to-rose-500/5',        ring: 'ring-rose-500/30',     text: 'text-rose-300',    sparkStroke: '#f43f5e', bg: 'bg-rose-500' },
  violet:  { gradient: 'from-violet-500/20 to-violet-500/5',    ring: 'ring-violet-500/30',   text: 'text-violet-300',  sparkStroke: '#a855f7', bg: 'bg-violet-500' },
  cyan:    { gradient: 'from-cyan-500/20 to-cyan-500/5',        ring: 'ring-cyan-500/30',     text: 'text-cyan-300',    sparkStroke: '#06b6d4', bg: 'bg-cyan-500' },
  zinc:    { gradient: 'from-zinc-700/40 to-zinc-700/10',       ring: 'ring-zinc-700/40',     text: 'text-zinc-200',    sparkStroke: '#71717a', bg: 'bg-zinc-500' }
};

export function AnimatedStatCard(props: AnimatedStatCardProps) {
  const {
    label, value, sparkline = [], trend = 'flat', color = 'zinc',
    icon, emoji, href, sub, unit, delta, liveIndicator, onClick
  } = props;
  const c = COLOR_MAP[color] || COLOR_MAP.zinc;

  const [displayValue, setDisplayValue] = useState<number | string>(typeof value === 'number' ? 0 : value);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Count-up au mount avec IntersectionObserver
  useEffect(() => {
    if (typeof value !== 'number') { setDisplayValue(value); return; }
    if (!ref.current) return;
    let started = false;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) {
          started = true;
          const target = value;
          const duration = 1200;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = Math.min(1, (now - start) / duration);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - elapsed, 3);
            setDisplayValue(Math.round(target * eased));
            if (elapsed < 1) requestAnimationFrame(tick);
            else setDisplayValue(target);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [value]);

  const Wrapper: any = href ? 'a' : (onClick ? 'button' : 'div');
  const wrapperProps = href ? { href } : (onClick ? { onClick, type: 'button' } : {});

  return (
    <Wrapper
      ref={ref}
      {...wrapperProps}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative overflow-hidden block rounded-2xl ring-1 ${c.ring} bg-gradient-to-br ${c.gradient} backdrop-blur p-4
        transition-all duration-300 hover:scale-[1.02] hover:ring-2 hover:shadow-2xl cursor-${href || onClick ? 'pointer' : 'default'} text-left w-full`}
    >
      {/* Particules flottantes en fond (subtil) */}
      <FloatingParticles color={c.sparkStroke} active={hovered} />

      {/* Heat shine — gradient lumineux qui balaye en hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
        style={{
          background: `linear-gradient(110deg, transparent 30%, ${c.sparkStroke}33 50%, transparent 70%)`,
          animation: hovered ? 'cardShine 1.5s ease-in-out' : undefined
        }}
      />

      {/* Live dot */}
      {liveIndicator && (
        <span className="absolute top-2 right-2 flex items-center gap-1">
          <span className="relative flex w-2 h-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.bg} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${c.bg}`} />
          </span>
          <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-500">live</span>
        </span>
      )}

      <div className="relative flex items-start gap-3">
        {(icon || emoji) && (
          <div className={`shrink-0 w-10 h-10 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800 flex items-center justify-center text-lg ${c.text}`}>
            {emoji || icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className={`font-mono font-bold text-2xl md:text-3xl ${c.text} tabular-nums`}>
              {typeof displayValue === 'number' ? displayValue.toLocaleString('fr-FR') : displayValue}
            </span>
            {unit && <span className={`text-sm font-bold ${c.text} opacity-70`}>{unit}</span>}
            {typeof delta === 'number' && delta !== 0 && (
              <span className={`text-[11px] font-bold ml-2 ${delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {delta > 0 ? '↗' : '↘'} {Math.abs(delta)}%
              </span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-0.5">{label}</div>
          {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
        </div>
      </div>

      {/* Sparkline */}
      {sparkline.length >= 2 && (
        <Sparkline values={sparkline} color={c.sparkStroke} trend={trend} />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cardShine { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}} />
    </Wrapper>
  );
}

/* ─── Sparkline SVG natif ─────────────────────────────────────── */
function Sparkline({ values, color, trend }: { values: number[]; color: string; trend?: 'up' | 'down' | 'flat' }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 200;
  const h = 36;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const path = `M ${points.join(' L ')}`;
  const areaPath = `${path} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-9 mt-3">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        style={{
          filter: `drop-shadow(0 0 4px ${color}88)`,
          strokeDasharray: w * 1.5,
          strokeDashoffset: w * 1.5,
          animation: 'sparkDraw 1.4s ease-out forwards'
        }}
      />
      {/* Last dot */}
      {points.length > 0 && (() => {
        const last = points[points.length - 1].split(',').map(Number);
        return (
          <>
            <circle cx={last[0]} cy={last[1]} r="4" fill={color} opacity="0.3">
              <animate attributeName="r" values="3;6;3" dur="1.8s" repeatCount="indefinite" />
            </circle>
            <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
          </>
        );
      })()}
      <style dangerouslySetInnerHTML={{ __html: '@keyframes sparkDraw { to { stroke-dashoffset: 0; } }' }} />
    </svg>
  );
}

/* ─── Particules flottantes subtiles ─────────────────────────── */
function FloatingParticles({ color, active }: { color: string; active: boolean }) {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    cx: 10 + (i * 17) % 90,
    cy: 10 + (i * 23) % 90,
    r: 0.8 + (i % 3) * 0.4,
    delay: i * 0.3
  }));
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" preserveAspectRatio="none" viewBox="0 0 100 100">
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={`${p.cx}%`} cy={`${p.cy}%`} r={p.r}
          fill={color}
          style={{
            animation: `floatParticle ${4 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: active ? 0.8 : 0.3,
            transition: 'opacity 0.3s'
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatParticle { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, -10px); } }
      `}} />
    </svg>
  );
}
