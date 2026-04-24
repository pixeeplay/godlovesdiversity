/**
 * Cœur néon multi-couches : plusieurs cœurs entrelacés en arc-en-ciel,
 * style enseigne lumineuse / vitrail moderne.
 */
export function NeonHeart({ size = 320 }: { size?: number }) {
  const colors = ['#FF2BB1', '#8B5CF6', '#22D3EE', '#34D399', '#FBBF24', '#EF4444'];
  return (
    <div className="neon-heart" style={{ width: size, height: size }}>
      <svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* 6 cœurs concentriques */}
        {colors.map((c, i) => {
          const scale = 1 - i * 0.13;
          return (
            <path
              key={i}
              d="M0,80 C-60,30 -90,-10 -60,-50 C-40,-75 -10,-65 0,-40 C10,-65 40,-75 60,-50 C90,-10 60,30 0,80 Z"
              transform={`scale(${scale})`}
              fill="none"
              stroke={c}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              opacity={0.95 - i * 0.08}
            />
          );
        })}
      </svg>
    </div>
  );
}
