'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminPageMeta, type AdminPageMeta } from '@/lib/admin-page-meta';

/**
 * Bandeau animé affiché en haut de chaque page admin.
 * - Lit le pathname courant et résout la meta correspondante
 * - Affiche un gradient de couleur thématique
 * - Pattern SVG animé en fond (8 variantes)
 * - Particules flottantes interactives (suivent la souris)
 * - Title + desc + emoji + badge
 *
 * Pas affiché sur /admin/login.
 */
export function AdminPageBanner() {
  const pathname = usePathname() || '/admin';

  // Sur /admin/login → pas de banner
  if (pathname.startsWith('/admin/login')) return null;

  const meta = getAdminPageMeta(pathname);

  return <Banner key={pathname} meta={meta} />;
}

function Banner({ meta }: { meta: AdminPageMeta }) {
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
      onMouseLeave={() => setMouse(null)}
      className={`relative overflow-hidden bg-gradient-to-br ${meta.gradient}
        ${mounted ? 'opacity-100' : 'opacity-0'}
        transition-opacity duration-500
        rounded-none lg:rounded-2xl mb-4 lg:mb-6
        ring-1 ring-white/10 shadow-2xl shadow-black/40`}
      style={{
        // Effet hover : un halo de lumière qui suit la souris
        ['--mx' as any]: mouse ? `${mouse.x}px` : '50%',
        ['--my' as any]: mouse ? `${mouse.y}px` : '50%'
      }}
    >
      {/* Halo lumineux qui suit la souris */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle 280px at var(--mx) var(--my), rgba(255,255,255,0.18), transparent 60%)`,
          opacity: mouse ? 1 : 0
        }}
      />

      {/* Pattern SVG animé en fond */}
      <PatternLayer pattern={meta.pattern} color={meta.color || '#ffffff'} />

      {/* Vignette dégradée pour la lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent pointer-events-none" />

      {/* CONTENU */}
      <div className="relative px-5 py-6 lg:px-8 lg:py-8 flex items-center gap-4 lg:gap-6">
        {/* Emoji avec animation */}
        <div
          className={`shrink-0 text-5xl lg:text-7xl select-none drop-shadow-2xl
            transition-transform duration-500 ease-out
            ${mounted ? 'translate-x-0 scale-100' : '-translate-x-4 scale-90'}
            hover:scale-110 hover:rotate-6 cursor-default
            animate-emoji-bob`}
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
        >
          {meta.emoji}
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1
              className={`font-display font-black text-2xl lg:text-4xl text-white
                transition-all duration-500 delay-75
                ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
                drop-shadow-lg`}
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
            >
              {meta.title}
            </h1>
            {meta.badge && (
              <span
                className={`text-[10px] font-black uppercase tracking-widest
                  px-2 py-1 rounded-full backdrop-blur-md
                  ${meta.badge === 'NEW' ? 'bg-fuchsia-500/30 text-white ring-1 ring-fuchsia-300/50' : ''}
                  ${meta.badge === 'BETA' ? 'bg-amber-500/30 text-white ring-1 ring-amber-300/50' : ''}
                  ${meta.badge === 'ADMIN' ? 'bg-rose-500/30 text-white ring-1 ring-rose-300/50' : ''}
                  ${meta.badge === 'DANGER' ? 'bg-red-600/40 text-white ring-1 ring-red-300/50' : ''}
                  animate-badge-pulse`}
              >
                {meta.badge}
              </span>
            )}
          </div>
          <p
            className={`text-white/90 text-xs lg:text-sm max-w-2xl
              transition-all duration-500 delay-150
              ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            {meta.desc}
          </p>
        </div>
      </div>

      {/* Animations CSS inline */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes emoji-bob {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-emoji-bob { animation: emoji-bob 3s ease-in-out infinite; }
        @keyframes badge-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
          50% { box-shadow: 0 0 12px 4px rgba(255,255,255,0.2); }
        }
        .animate-badge-pulse { animation: badge-pulse 2.5s ease-in-out infinite; }
      `}} />
    </header>
  );
}

/* ─── PATTERNS SVG ANIMÉS ────────────────────────────────────── */

function PatternLayer({ pattern, color }: { pattern: AdminPageMeta['pattern']; color: string }) {
  switch (pattern) {
    case 'dots':    return <DotsPattern color={color} />;
    case 'hex':     return <HexPattern color={color} />;
    case 'waves':   return <WavesPattern color={color} />;
    case 'orbits':  return <OrbitsPattern color={color} />;
    case 'grid':    return <GridPattern color={color} />;
    case 'spark':   return <SparkPattern color={color} />;
    case 'aurora':  return <AuroraPattern color={color} />;
    case 'circuit': return <CircuitPattern color={color} />;
    default:        return null;
  }
}

/** Constellation de points qui pulsent */
function DotsPattern({ color }: { color: string }) {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    cx: (i * 37) % 100,
    cy: (i * 53) % 100,
    r: 1 + (i % 3),
    delay: (i * 0.15) % 3
  }));
  return (
    <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
      {dots.map((d, i) => (
        <circle
          key={i} cx={`${d.cx}%`} cy={`${d.cy}%`} r={d.r}
          fill="white"
          style={{
            animation: `pulseDot 3s ease-in-out infinite`,
            animationDelay: `${d.delay}s`,
            transformOrigin: 'center'
          }}
        />
      ))}
      <style>{`@keyframes pulseDot{0%,100%{opacity:.3;transform:scale(1);}50%{opacity:1;transform:scale(1.5);}}`}</style>
    </svg>
  );
}

/** Hexagones flottants (mobile pattern) */
function HexPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
          <polygon
            points="30,2 56,17 56,45 30,60 4,45 4,17"
            fill="none"
            stroke="white"
            strokeWidth="1.2"
            opacity="0.6"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" style={{ animation: 'hexDrift 30s linear infinite' }} />
      <style>{`@keyframes hexDrift{from{transform:translateX(0);}to{transform:translateX(-60px);}}`}</style>
    </svg>
  );
}

/** Vagues sinusoïdales animées */
function WavesPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 800 200">
      <path
        d="M 0 100 Q 200 40, 400 100 T 800 100 T 1200 100 V 200 H 0 Z"
        fill="white"
        opacity="0.15"
        style={{ animation: 'waveSlide 12s ease-in-out infinite' }}
      />
      <path
        d="M 0 130 Q 200 70, 400 130 T 800 130 T 1200 130 V 200 H 0 Z"
        fill="white"
        opacity="0.1"
        style={{ animation: 'waveSlide 18s ease-in-out infinite reverse' }}
      />
      <style>{`@keyframes waveSlide{0%,100%{transform:translateX(0);}50%{transform:translateX(-100px);}}`}</style>
    </svg>
  );
}

/** Anneaux orbitaux (rotation lente) */
function OrbitsPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
      <g style={{ transformOrigin: '85% 50%', animation: 'orbitSpin 40s linear infinite' }}>
        <ellipse cx="85" cy="50" rx="45" ry="20" fill="none" stroke="white" strokeWidth="0.4" />
        <circle cx="40" cy="50" r="1.5" fill="white" />
      </g>
      <g style={{ transformOrigin: '85% 50%', animation: 'orbitSpinReverse 60s linear infinite' }}>
        <ellipse cx="85" cy="50" rx="60" ry="30" fill="none" stroke="white" strokeWidth="0.3" opacity="0.6" />
        <circle cx="25" cy="50" r="1" fill="white" />
      </g>
      <g style={{ transformOrigin: '85% 50%', animation: 'orbitSpin 90s linear infinite' }}>
        <ellipse cx="85" cy="50" rx="80" ry="42" fill="none" stroke="white" strokeWidth="0.2" opacity="0.4" />
      </g>
      <circle cx="85" cy="50" r="6" fill="white" opacity="0.3" />
      <circle cx="85" cy="50" r="3" fill="white" opacity="0.6" />
      <style>{`
        @keyframes orbitSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        @keyframes orbitSpinReverse{from{transform:rotate(0deg);}to{transform:rotate(-360deg);}}
      `}</style>
    </svg>
  );
}

/** Grille technique (lignes verticales/horizontales) */
function GridPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.5" />
        </pattern>
        <linearGradient id="gridFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      {/* Ligne scanner qui balaye */}
      <rect x="0" y="0" width="100%" height="2" fill="url(#gridFade)" opacity="0.4" style={{ animation: 'scanLine 6s linear infinite' }} />
      <style>{`@keyframes scanLine{from{transform:translateY(0);}to{transform:translateY(200px);}}`}</style>
    </svg>
  );
}

/** Étincelles qui s'allument et s'éteignent */
function SparkPattern({ color }: { color: string }) {
  const sparks = Array.from({ length: 15 }, (_, i) => ({
    x: (i * 41 + 7) % 100,
    y: (i * 67 + 13) % 100,
    delay: (i * 0.4) % 5,
    size: 2 + (i % 3)
  }));
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 100">
      {sparks.map((s, i) => (
        <g key={i} transform={`translate(${s.x},${s.y})`} style={{ animation: 'sparkBlink 4s ease-in-out infinite', animationDelay: `${s.delay}s` }}>
          <circle r={s.size * 0.5} fill="white" opacity="0.8" />
          <circle r={s.size * 1.5} fill="white" opacity="0.2" />
          {/* Croix de scintillement */}
          <line x1={-s.size * 1.8} y1="0" x2={s.size * 1.8} y2="0" stroke="white" strokeWidth="0.3" opacity="0.6" />
          <line x1="0" y1={-s.size * 1.8} x2="0" y2={s.size * 1.8} stroke="white" strokeWidth="0.3" opacity="0.6" />
        </g>
      ))}
      <style>{`@keyframes sparkBlink{0%,100%{opacity:0;transform:scale(0.5);}50%{opacity:1;transform:scale(1);}}`}</style>
    </svg>
  );
}

/** Aurore boréale (blobs colorés flottants) */
function AuroraPattern({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{
          background: 'white',
          top: '-20%',
          left: '60%',
          animation: 'auroraDrift1 18s ease-in-out infinite alternate'
        }}
      />
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-25"
        style={{
          background: 'white',
          bottom: '-30%',
          left: '20%',
          animation: 'auroraDrift2 22s ease-in-out infinite alternate'
        }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-2xl opacity-20"
        style={{
          background: 'white',
          top: '20%',
          right: '5%',
          animation: 'auroraDrift3 14s ease-in-out infinite alternate'
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes auroraDrift1 { 0%{transform:translate(0,0) scale(1);} 100%{transform:translate(-40px,30px) scale(1.15);} }
        @keyframes auroraDrift2 { 0%{transform:translate(0,0) scale(1);} 100%{transform:translate(50px,-20px) scale(0.9);} }
        @keyframes auroraDrift3 { 0%{transform:translate(0,0) scale(1);} 100%{transform:translate(-30px,-40px) scale(1.2);} }
      `}} />
    </div>
  );
}

/** Circuit imprimé animé (data flow) */
function CircuitPattern({ color }: { color: string }) {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 200 100">
      <defs>
        <linearGradient id="dataFlow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Lignes de circuit */}
      <path d="M 0 20 H 60 L 80 40 H 140 L 160 60 H 200" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5" />
      <path d="M 0 50 H 40 L 60 70 H 120 L 140 50 H 200" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5" />
      <path d="M 0 80 H 100 L 120 60 H 180 L 200 80" fill="none" stroke="white" strokeWidth="0.6" opacity="0.5" />
      {/* Nodes */}
      <circle cx="60" cy="20" r="2" fill="white" />
      <circle cx="140" cy="40" r="2" fill="white" />
      <circle cx="60" cy="70" r="2" fill="white" />
      <circle cx="120" cy="60" r="2" fill="white" />
      {/* Pulse de data qui voyage */}
      <circle r="3" fill="white">
        <animateMotion dur="5s" repeatCount="indefinite" path="M 0 20 H 60 L 80 40 H 140 L 160 60 H 200" />
      </circle>
      <circle r="2.5" fill="white" opacity="0.7">
        <animateMotion dur="7s" repeatCount="indefinite" path="M 0 50 H 40 L 60 70 H 120 L 140 50 H 200" />
      </circle>
    </svg>
  );
}
