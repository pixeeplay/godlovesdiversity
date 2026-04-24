'use client';

/**
 * Backdrop SVG : panorama de lieux saints illuminés en néon (style nuit).
 * Cathédrale gauche · dôme mosquée central · synagogue droite · menorah · clochers ·
 * reflets dans l'eau. Halos colorés rose/violet/cyan/ambre.
 */
export function SacredSkyline({ height = 480 }: { height?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height }}>
      <svg
        viewBox="0 0 1600 480"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0314" />
            <stop offset="60%" stopColor="#150828" />
            <stop offset="100%" stopColor="#1a0a30" />
          </linearGradient>
          <radialGradient id="domeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cathGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff2bb1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff2bb1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="synGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <filter id="bldGlow"><feGaussianBlur stdDeviation="2" /></filter>
        </defs>

        {/* Ciel */}
        <rect width="1600" height="480" fill="url(#skyGrad)" />

        {/* Étoiles */}
        {[[120,40],[260,80],[400,30],[580,60],[740,20],[900,70],[1060,40],[1240,90],[1400,30],[1500,70]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="1.2" fill="white" opacity="0.7"/>
        ))}

        {/* Halos */}
        <circle cx="200" cy="280" r="220" fill="url(#cathGlow)" />
        <circle cx="800" cy="260" r="260" fill="url(#domeGlow)" />
        <circle cx="1300" cy="290" r="200" fill="url(#synGlow)" />

        {/* === CATHÉDRALE GAUCHE (rose néon) === */}
        <g fill="#0a0210" stroke="#ff2bb1" strokeWidth="2" filter="url(#bldGlow)">
          {/* corps */}
          <path d="M40 480 L40 340 L80 320 L80 280 L120 280 L120 200 L160 180 L200 200 L200 280 L240 280 L240 320 L280 340 L280 480 Z" />
          {/* tour gauche */}
          <path d="M60 480 L60 250 L100 230 L100 200 L100 250 L100 480 Z" />
          {/* tour droite */}
          <path d="M220 480 L220 250 L260 230 L260 200 L260 250 L260 480 Z" />
          {/* flèche centrale */}
          <path d="M150 200 L160 100 L170 200 Z" />
          {/* rosace */}
        </g>
        <circle cx="160" cy="260" r="22" fill="none" stroke="#ff2bb1" strokeWidth="1.5" />
        <circle cx="160" cy="260" r="14" fill="#ff2bb1" opacity="0.4" />
        {/* fenêtres lumineuses */}
        {[[78,300],[78,360],[78,420],[260,300],[260,360],[260,420],[140,320],[180,320],[140,380],[180,380]].map(([x,y],i)=>(
          <rect key={i} x={x} y={y} width="6" height="14" fill="#ffd700" opacity="0.85" />
        ))}
        {/* croix */}
        <path d="M158 100 L162 100 L162 80 L168 80 L168 76 L162 76 L162 64 L158 64 L158 76 L152 76 L152 80 L158 80 Z" fill="#fff" opacity="0.9" />

        {/* === MOSQUÉE CENTRALE (dôme cyan/vert) === */}
        <g fill="#0a0210" stroke="#22d3ee" strokeWidth="2" filter="url(#bldGlow)">
          {/* base */}
          <path d="M620 480 L620 320 L1000 320 L1000 480 Z" />
          {/* dôme principal */}
          <path d="M680 320 Q680 200 810 200 Q940 200 940 320 Z" />
          <ellipse cx="810" cy="200" rx="20" ry="6" fill="#34d399" opacity="0.5" />
          {/* dômes secondaires */}
          <path d="M620 320 Q620 270 660 270 Q700 270 700 320 Z" />
          <path d="M920 320 Q920 270 960 270 Q1000 270 1000 320 Z" />
          {/* minarets */}
          <path d="M580 480 L580 240 L590 230 L590 200 L600 200 L600 230 L610 240 L610 480 Z" />
          <path d="M1010 480 L1010 240 L1020 230 L1020 200 L1030 200 L1030 230 L1040 240 L1040 480 Z" />
          {/* croissant */}
          <circle cx="810" cy="180" r="6" fill="none" stroke="#34d399" strokeWidth="1.5" />
        </g>
        {/* Arcs ouverts (lumière intérieure) */}
        {[680,720,760,800,840,880,920].map((x,i)=>(
          <path key={i} d={`M${x} 470 L${x} 380 Q${x+15} 360 ${x+30} 380 L${x+30} 470 Z`}
                fill="#fbbf24" opacity="0.55" />
        ))}
        <ellipse cx="585" cy="195" rx="3" ry="3" fill="#34d399" />
        <ellipse cx="1025" cy="195" rx="3" ry="3" fill="#34d399" />

        {/* === SYNAGOGUE DROITE (ambre) === */}
        <g fill="#0a0210" stroke="#fbbf24" strokeWidth="2" filter="url(#bldGlow)">
          {/* base */}
          <path d="M1180 480 L1180 320 L1500 320 L1500 480 Z" />
          {/* triangle façade */}
          <path d="M1200 320 L1340 240 L1480 320 Z" />
          {/* fenêtres */}
        </g>
        {/* Étoile de David */}
        <g transform="translate(1340 280)" stroke="#fbbf24" strokeWidth="2" fill="none">
          <path d="M0 -18 L16 9 L-16 9 Z" />
          <path d="M0 18 L16 -9 L-16 -9 Z" />
        </g>
        {/* fenêtres en arche */}
        {[1210,1260,1310,1370,1420,1470].map((x,i)=>(
          <path key={i} d={`M${x} 470 L${x} 380 Q${x+12} 360 ${x+24} 380 L${x+24} 470 Z`}
                fill="#fbbf24" opacity="0.5" />
        ))}
        {/* Menorah à droite */}
        <g transform="translate(1540 380)" stroke="#fbbf24" strokeWidth="2" fill="none">
          <path d="M0 100 L0 30 M-40 30 L40 30 M-30 30 Q-30 0 -30 0 M-15 30 Q-15 -10 -15 -10 M0 30 L0 -20 M15 30 Q15 -10 15 -10 M30 30 Q30 0 30 0" />
          {/* flammes */}
          {[-30,-15,0,15,30].map((x,i)=>(
            <ellipse key={i} cx={x} cy={x===0?-22:-12} rx="2" ry="4" fill="#ffd700" opacity="0.9" stroke="none" />
          ))}
        </g>

        {/* Reflet d'eau */}
        <rect x="0" y="468" width="1600" height="12" fill="#ff2bb1" opacity="0.10" />
        <rect x="0" y="475" width="1600" height="5" fill="#22d3ee" opacity="0.07" />
      </svg>
    </div>
  );
}
