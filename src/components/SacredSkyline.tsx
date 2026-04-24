'use client';

/**
 * Bandeau de silhouettes de lieux saints qui défile horizontalement.
 * Utilisé en arrière-plan du hero et pour les transitions.
 * 100 % SVG — pas d'image externe nécessaire.
 */

const COLORS = ['#FF2BB1', '#8B5CF6', '#22D3EE', '#34D399', '#FBBF24', '#EF4444'];

function Building({ type, color, x }: { type: string; color: string; x: number }) {
  // 6 silhouettes simplifiées : église, cathédrale, mosquée, synagogue, temple, basilique
  const paths: Record<string, string> = {
    church:
      'M50 200 L50 90 L40 90 L60 60 L80 90 L70 90 L70 80 L65 80 L65 60 L75 60 L75 50 L70 50 L70 40 L65 40 L65 50 L60 50 L60 30 L55 30 L55 50 L50 50 L50 40 L45 40 L45 50 L40 50 L40 60 L50 60 L50 80 L45 80 L45 90 L50 90 Z M50 90 L50 200 L100 200 L100 90 L80 90 Z M0 200 L0 110 L40 110 L40 200 Z',
    mosque:
      'M50 200 L50 100 Q50 60 75 60 Q100 60 100 100 L100 200 Z M75 60 L75 35 L73 35 L73 28 L77 28 L77 35 L75 35 Z M30 200 L30 130 Q30 110 45 110 L45 200 Z M105 200 L105 130 Q105 110 120 110 L120 200 Z',
    synagogue:
      'M50 200 L50 90 L75 50 L100 90 L100 200 Z M75 70 L65 80 L75 70 L85 80 L75 70 Z M75 100 L60 115 L75 100 L90 115 L75 100 Z M30 200 L30 110 L60 110 L60 200 Z',
    temple:
      'M30 200 L30 100 L60 70 L90 100 L120 70 L150 100 L150 200 Z M40 100 L40 200 M60 100 L60 200 M80 100 L80 200 M100 100 L100 200 M120 100 L120 200',
    cathedral:
      'M0 200 L0 80 L20 60 L40 80 L40 50 L60 30 L80 50 L80 80 L100 60 L120 80 L120 200 Z M55 50 L55 35 L65 35 L65 50 Z M58 35 L58 28 L62 28 L62 35 Z',
    basilica:
      'M0 200 L0 110 L25 110 L25 90 L20 80 L30 60 L40 80 L35 90 L35 110 L65 110 L65 90 L60 80 L70 60 L80 80 L75 90 L75 110 L100 110 L100 200 Z'
  };

  return (
    <g transform={`translate(${x}, 0)`} opacity="0.85">
      <path d={paths[type]} fill="black" stroke={color} strokeWidth="1.2" filter={`drop-shadow(0 0 8px ${color})`} />
      {/* fenêtres lumineuses */}
      <circle cx={x === 0 ? 60 : 40} cy={120} r={3} fill={color} opacity={0.9} />
      <rect x={x === 0 ? 55 : 35} y={140} width={4} height={8} fill={color} opacity={0.7} />
    </g>
  );
}

export function SacredSkyline({ height = 220 }: { height?: number }) {
  // Compose une bande de 6 bâtiments. On la duplique 2× pour boucler en CSS.
  const buildings = ['church', 'mosque', 'synagogue', 'temple', 'cathedral', 'basilica'];
  const items = [...buildings, ...buildings, ...buildings];

  return (
    <div className="sacred-skyline relative overflow-hidden pointer-events-none" style={{ height }}>
      <div className="skyline-track absolute inset-y-0 left-0 flex">
        {[0, 1].map((dup) => (
          <svg
            key={dup}
            viewBox="0 0 1800 220"
            preserveAspectRatio="none"
            style={{ width: '1800px', height: '100%' }}
          >
            {items.slice(0, 9).map((b, i) => (
              <Building key={`${dup}-${i}`} type={b} color={COLORS[i % COLORS.length]} x={i * 200} />
            ))}
          </svg>
        ))}
      </div>
      {/* Voile en haut/bas pour fondu (s'adapte au thème) */}
      <div className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
           style={{ background: 'linear-gradient(180deg, var(--skyline-fade) 0%, transparent 100%)' }} />
      <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none"
           style={{ background: 'linear-gradient(0deg, var(--skyline-fade) 0%, transparent 100%)' }} />
    </div>
  );
}
