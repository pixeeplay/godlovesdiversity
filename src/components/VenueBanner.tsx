'use client';

/**
 * VenueBanner — bannière SVG procédurale qui s'adapte au type/rating du lieu.
 * Utilisée comme fallback quand le venue n'a pas de coverImage.
 * Style "liquid glass" inspiré iOS 18 / visionOS.
 */

interface Props {
  venueName: string;
  type?: string;
  rating?: string;
  /** id stable pour les gradients (évite collisions SSR) */
  id?: string;
  className?: string;
}

const TYPE_PALETTE: Record<string, { from: string; mid: string; to: string; emoji: string }> = {
  RESTAURANT:        { from: '#f43f5e', mid: '#fb923c', to: '#fbbf24', emoji: '🍽' },
  BAR:               { from: '#a855f7', mid: '#ec4899', to: '#f43f5e', emoji: '🍸' },
  CAFE:              { from: '#a16207', mid: '#d97706', to: '#f59e0b', emoji: '☕' },
  CLUB:              { from: '#7c3aed', mid: '#c026d3', to: '#ec4899', emoji: '🪩' },
  HOTEL:             { from: '#0891b2', mid: '#06b6d4', to: '#22d3ee', emoji: '🏨' },
  SHOP:              { from: '#db2777', mid: '#e11d48', to: '#f43f5e', emoji: '🛍️' },
  CULTURAL:          { from: '#7e22ce', mid: '#9333ea', to: '#a855f7', emoji: '🎭' },
  CHURCH:            { from: '#475569', mid: '#64748b', to: '#94a3b8', emoji: '⛪' },
  TEMPLE:            { from: '#b45309', mid: '#d97706', to: '#f59e0b', emoji: '🛕' },
  COMMUNITY_CENTER:  { from: '#059669', mid: '#10b981', to: '#34d399', emoji: '🤝' },
  HEALTH:            { from: '#0d9488', mid: '#14b8a6', to: '#5eead4', emoji: '💊' },
  ASSOCIATION:       { from: '#1d4ed8', mid: '#3b82f6', to: '#60a5fa', emoji: '🌈' },
  OTHER:             { from: '#6366f1', mid: '#8b5cf6', to: '#a855f7', emoji: '✨' }
};

export function VenueBanner({ venueName, type = 'OTHER', id = 'def', className = '' }: Props) {
  const p = TYPE_PALETTE[type] || TYPE_PALETTE.OTHER;
  const gid = `vb-${id}`;

  return (
    <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMid slice" className={`w-full h-full ${className}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Gradient principal */}
        <linearGradient id={`${gid}-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={p.from} />
          <stop offset="50%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.to} />
        </linearGradient>
        {/* Halo lumineux liquid glass */}
        <radialGradient id={`${gid}-halo`} cx="20%" cy="0%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-halo2`} cx="85%" cy="100%" r="50%">
          <stop offset="0%" stopColor={p.to} stopOpacity="0.7" />
          <stop offset="70%" stopColor={p.to} stopOpacity="0" />
        </radialGradient>
        {/* Texture noise grain */}
        <filter id={`${gid}-noise`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0" />
        </filter>
        <filter id={`${gid}-blur`}>
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>

      {/* Background gradient */}
      <rect width="800" height="320" fill={`url(#${gid}-bg)`} />

      {/* Halo / glow blobs (style liquid glass) */}
      <ellipse cx="120" cy="60" rx="280" ry="180" fill={`url(#${gid}-halo)`} />
      <ellipse cx="680" cy="280" rx="240" ry="160" fill={`url(#${gid}-halo2)`} />

      {/* Mesh blob soft */}
      <circle cx="400" cy="160" r="250" fill="#ffffff" opacity="0.08" filter={`url(#${gid}-blur)`} />

      {/* Pattern subtle dots (Apple-like) */}
      <g opacity="0.16" fill="#ffffff">
        {Array.from({ length: 12 }).map((_, row) =>
          Array.from({ length: 30 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={col * 28 + 14} cy={row * 28 + 14} r={1.2} />
          ))
        ).flat()}
      </g>

      {/* Noise overlay */}
      <rect width="800" height="320" filter={`url(#${gid}-noise)`} opacity="0.5" />

      {/* Big watermark emoji */}
      <text
        x="640" y="240"
        fontSize="220"
        opacity="0.18"
        textAnchor="middle"
        style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji' }}
      >
        {p.emoji}
      </text>

      {/* Bottom gradient for legibility */}
      <linearGradient id={`${gid}-bottom`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
      </linearGradient>
      <rect width="800" height="320" fill={`url(#${gid}-bottom)`} />
    </svg>
  );
}
