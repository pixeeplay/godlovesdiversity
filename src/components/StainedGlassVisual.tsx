/**
 * Visuel SVG évocateur : vitrail gothique + faisceau de lumière arc-en-ciel + silhouette humaine.
 * 4 variantes (différentes silhouettes / couleurs dominantes).
 * Utilisable comme placeholder partout : hero, fallback de produits, sections vides, etc.
 */
type Variant = 'man' | 'woman' | 'group' | 'praying';

const SILHOUETTES: Record<Variant, string> = {
  // Homme debout, vu de dos, bras le long du corps
  man: `M0,180 Q-22,140 -28,90 Q-32,55 -25,35 Q-30,15 -10,5 Q-12,-5 -8,-15 Q-12,-30 0,-32 Q12,-30 8,-15 Q12,-5 10,5 Q30,15 25,35 Q32,55 28,90 Q22,140 0,180 Z`,
  // Femme debout, robe évasée
  woman: `M0,180 Q-38,140 -42,100 Q-44,80 -28,50 Q-32,30 -22,20 Q-12,5 -10,-5 Q-12,-15 -8,-22 Q-12,-32 0,-34 Q12,-32 8,-22 Q12,-15 10,-5 Q12,5 22,20 Q32,30 28,50 Q44,80 42,100 Q38,140 0,180 Z`,
  // Groupe (3 silhouettes)
  group: `M-60,180 Q-72,140 -75,90 Q-78,55 -72,35 Q-76,15 -64,5 Q-66,-5 -60,-15 Q-66,-25 -55,-27 Q-44,-25 -50,-15 Q-44,-5 -46,5 Q-34,15 -38,35 Q-32,55 -35,90 Q-32,140 -20,180 Z M0,180 Q-12,140 -15,90 Q-18,55 -12,35 Q-16,15 -4,5 Q-6,-5 0,-15 Q-6,-25 5,-27 Q16,-25 10,-15 Q16,-5 14,5 Q26,15 22,35 Q28,55 25,90 Q28,140 40,180 Z M60,180 Q48,140 45,90 Q42,55 48,35 Q44,15 56,5 Q54,-5 60,-15 Q54,-25 65,-27 Q76,-25 70,-15 Q76,-5 74,5 Q86,15 82,35 Q88,55 85,90 Q88,140 100,180 Z`,
  // Silhouette de personne
  praying: `M-30,180 Q-32,150 -28,130 Q-25,110 -15,90 Q-10,70 -5,50 Q-15,30 -10,15 Q-12,-5 -8,-15 Q-12,-25 0,-27 Q12,-25 8,-15 Q12,-5 10,15 Q15,30 5,50 Q10,70 15,90 Q25,110 28,130 Q32,150 30,180 Z`
};

type Props = {
  variant?: Variant;
  className?: string;
  showSilhouette?: boolean;
};

export function StainedGlassVisual({ variant = 'man', className = '', showSilhouette = true }: Props) {
  const sil = SILHOUETTES[variant];
  return (
    <svg
      viewBox="-200 -120 400 360"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${className}`}
      preserveAspectRatio="xMidYMid slice"
      aria-label="Vitrail arc-en-ciel — parislgbt"
    >
      <defs>
        {/* Vitrail dégradé sombre */}
        <radialGradient id="bg-glow" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#3b1d4a" />
          <stop offset="50%" stopColor="#1a0a2e" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>

        {/* Faisceau lumière arc-en-ciel */}
        <linearGradient id="rainbow-beam" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FF2BB1" stopOpacity="0.95" />
          <stop offset="20%" stopColor="#FBBF24" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#34D399" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#22D3EE" stopOpacity="0.65" />
          <stop offset="80%" stopColor="#8B5CF6" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FF2BB1" stopOpacity="0" />
        </linearGradient>

        {/* Glow */}
        <filter id="god-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Patterns vitrail (couleurs cathédrale) */}
        <pattern id="window-rose" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#7c3aed" opacity="0.4" />
          <circle cx="20" cy="20" r="12" fill="#FF2BB1" opacity="0.55" />
        </pattern>
        <pattern id="window-amber" width="35" height="35" patternUnits="userSpaceOnUse">
          <rect width="35" height="35" fill="#9f1239" opacity="0.4" />
          <circle cx="17" cy="17" r="10" fill="#FBBF24" opacity="0.65" />
        </pattern>
        <pattern id="window-blue" width="35" height="35" patternUnits="userSpaceOnUse">
          <rect width="35" height="35" fill="#1e40af" opacity="0.5" />
          <circle cx="17" cy="17" r="10" fill="#22D3EE" opacity="0.6" />
        </pattern>
        <pattern id="window-green" width="35" height="35" patternUnits="userSpaceOnUse">
          <rect width="35" height="35" fill="#065f46" opacity="0.5" />
          <circle cx="17" cy="17" r="10" fill="#34D399" opacity="0.6" />
        </pattern>
      </defs>

      {/* FOND */}
      <rect x="-200" y="-120" width="400" height="360" fill="url(#bg-glow)" />

      {/* VITRAIL CENTRAL — arche gothique */}
      <g opacity="0.95">
        <path
          d="M -110 -100 L -110 60 Q -110 40 -85 25 L -85 -75 Q -85 -100 -65 -100 L 65 -100 Q 85 -100 85 -75 L 85 25 Q 110 40 110 60 L 110 -100 Z"
          fill="#1a0a2e"
        />
        {/* Grande rosace */}
        <circle cx="0" cy="-50" r="42" fill="url(#window-rose)" stroke="#7c3aed" strokeWidth="2.5" opacity="0.9" />
        <circle cx="0" cy="-50" r="22" fill="#FF2BB1" opacity="0.85" />
        <circle cx="0" cy="-50" r="10" fill="#FBBF24" opacity="0.95" filter="url(#god-glow)" />

        {/* Ogives latérales */}
        <path d="M -75 -75 Q -75 -90 -55 -90 L -55 0 Q -55 15 -75 15 Z" fill="url(#window-amber)" stroke="#9f1239" strokeWidth="1.5" />
        <path d="M 75 -75 Q 75 -90 55 -90 L 55 0 Q 55 15 75 15 Z" fill="url(#window-blue)" stroke="#1e40af" strokeWidth="1.5" />
        <path d="M -45 -65 Q -45 -80 -25 -80 L -25 -10 Q -25 5 -45 5 Z" fill="url(#window-green)" stroke="#065f46" strokeWidth="1.5" />
        <path d="M 45 -65 Q 45 -80 25 -80 L 25 -10 Q 25 5 45 5 Z" fill="url(#window-amber)" stroke="#9f1239" strokeWidth="1.5" />

        {/* Croix au centre */}
        <rect x="-3" y="20" width="6" height="35" fill="#FBBF24" opacity="0.8" />
        <rect x="-12" y="32" width="24" height="6" fill="#FBBF24" opacity="0.8" />
      </g>

      {/* FAISCEAU LUMIÈRE ARC-EN-CIEL (depuis la rosace, descend en éventail) */}
      <g style={{ mixBlendMode: 'screen' }} filter="url(#god-glow)">
        <path d="M -25 -50 L 25 -50 L 110 240 L -110 240 Z" fill="url(#rainbow-beam)" opacity="0.85" />
        <path d="M -10 -50 L 10 -50 L 50 240 L -50 240 Z" fill="url(#rainbow-beam)" opacity="0.6" />
      </g>

      {/* PARTICULES / POUSSIÈRE LUMINEUSE */}
      {Array.from({ length: 24 }).map((_, i) => {
        const x = -120 + Math.random() * 240;
        const y = -30 + Math.random() * 200;
        const r = 0.8 + Math.random() * 1.8;
        return <circle key={i} cx={x} cy={y} r={r} fill="#FFE7B0" opacity={0.4 + Math.random() * 0.5} />;
      })}

      {/* SILHOUETTE — au centre, vue de dos, debout dans la lumière */}
      {showSilhouette && (
        <g transform="translate(0, 30)">
          <path d={sil} fill="#0a0314" opacity="0.95" />
          {/* Halo lumineux derrière la silhouette */}
          <ellipse cx="0" cy="-20" rx="60" ry="35" fill="#FBBF24" opacity="0.15" filter="url(#god-glow)" />
        </g>
      )}

      {/* SOL — réflexion lumineuse */}
      <ellipse cx="0" cy="220" rx="180" ry="20" fill="url(#rainbow-beam)" opacity="0.4" filter="url(#god-glow)" />
    </svg>
  );
}
