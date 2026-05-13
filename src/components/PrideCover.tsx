/**
 * PrideCover — Image générative SVG par Pride.
 * Gradient unique par ville + emoji + nom de la ville en grand.
 * Aucune dépendance externe, ultra-léger, accessible.
 */
import type { PrideEvent } from '@/lib/pride-data';

interface Props {
  event: PrideEvent;
  variant: 'card' | 'hero';
}

export function PrideCover({ event, variant }: Props) {
  const [c1, c2, c3] = event.colors;
  const isHero = variant === 'hero';

  // Format viewBox : 16:9 pour les cards, 21:9 pour le hero
  const w = isHero ? 1200 : 800;
  const h = isHero ? 500 : 450;
  const cityFontSize = isHero ? 120 : 90;
  const emojiSize = isHero ? 180 : 130;
  const titleY = isHero ? 380 : 360;

  // Le SVG est statique côté client (rendu pur) — pas de problème d'hydration
  return (
    <div className={isHero ? 'aspect-[12/5]' : 'aspect-[16/9]'}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        aria-label={`Cover de ${event.name}`}
      >
        <defs>
          <linearGradient id={`bg-${event.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="50%" stopColor={c2} />
            <stop offset="100%" stopColor={c3} />
          </linearGradient>
          <radialGradient id={`halo-${event.id}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <pattern id={`dots-${event.id}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1.5" fill="rgba(255,255,255,0.18)" />
          </pattern>
          <filter id={`blur-${event.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Background gradient */}
        <rect width={w} height={h} fill={`url(#bg-${event.id})`} />

        {/* Dots pattern overlay */}
        <rect width={w} height={h} fill={`url(#dots-${event.id})`} />

        {/* Diagonal stripes pride flag style */}
        <g opacity="0.18">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i}
              x={-200 + i * (w / 6)}
              y={0}
              width={w / 6 + 20}
              height={h}
              fill={i % 2 === 0 ? '#ffffff' : c1}
              transform={`skewX(-15)`}
              opacity={0.06}
            />
          ))}
        </g>

        {/* Halo */}
        <ellipse cx={w / 2} cy={h / 3} rx={w / 2.5} ry={h / 2.5} fill={`url(#halo-${event.id})`} />

        {/* Emoji décoratif */}
        <text
          x={w - 80}
          y={120}
          fontSize={emojiSize / 2.5}
          textAnchor="end"
          opacity="0.85"
        >
          {event.emoji}
        </text>

        {/* Type label en haut à gauche */}
        <text
          x={50}
          y={70}
          fill="rgba(255,255,255,0.85)"
          fontSize={isHero ? 22 : 18}
          fontFamily="-apple-system, system-ui, sans-serif"
          fontWeight="700"
          letterSpacing="6"
        >
          {event.type === 'marche-officielle' ? 'PRIDE 2026' :
           event.type === 'pride-nuit' ? 'PRIDE DE NUIT' :
           event.type === 'existrans' ? 'EXISTRANS' :
           event.type === 'festival' ? 'FESTIVAL' :
           'EVENT LGBT'}
        </text>

        {/* Nom de la ville en très grand */}
        <text
          x={w / 2}
          y={titleY - 60}
          fill="white"
          fontSize={cityFontSize}
          fontFamily="-apple-system, system-ui, sans-serif"
          fontWeight="900"
          textAnchor="middle"
          letterSpacing="-3"
          style={{ textShadow: '0 4px 30px rgba(0,0,0,0.4)' }}
        >
          {event.cityUpper}
        </text>

        {/* Date en bas */}
        <text
          x={w / 2}
          y={titleY + 30}
          fill="rgba(255,255,255,0.92)"
          fontSize={isHero ? 32 : 26}
          fontFamily="-apple-system, system-ui, sans-serif"
          fontWeight="600"
          textAnchor="middle"
          letterSpacing="2"
        >
          {new Date(event.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
