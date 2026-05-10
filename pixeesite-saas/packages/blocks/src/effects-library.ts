/**
 * Bibliothèque de 100 effets CSS purs pour le Page Builder GLD.
 *
 * Chaque effet a :
 *   - id        : identifiant unique kebab-case
 *   - name      : libellé affiché
 *   - category  : entry | hover | scroll | text | background | card | transition | reveal
 *   - css       : règles CSS à injecter (animation @keyframes + class .gld-fx-<id>)
 *   - usage     : sur quoi l'appliquer (block | text | image | card | hero)
 *
 * À utiliser via <EffectWrapper effect="zoom-in"> ou class={`gld-fx-${id}`}.
 * Le composant <EffectsStyles /> injecte tous les keyframes une seule fois.
 */

export type EffectCategory =
  | 'entry'      // animations à l'apparition
  | 'hover'      // animations au survol
  | 'scroll'    // animations liées au scroll
  | 'text'       // animations spécifiques texte
  | 'background' // backgrounds animés
  | 'card'       // effets sur cards/conteneurs
  | 'transition' // transitions entre états
  | 'reveal';    // mise en évidence (mask, clip, etc.)

export interface Effect {
  id: string;
  name: string;
  category: EffectCategory;
  desc: string;
  emoji?: string;
  intensity?: 'subtle' | 'medium' | 'wow';
}

// 100 effets organisés par catégorie
export const EFFECTS: Effect[] = [
  // ─── ENTRY (20) ─────────────────────────────────────────
  { id: 'fade-in',         name: 'Fade in',          category: 'entry', emoji: '🌅', desc: 'Apparition douce', intensity: 'subtle' },
  { id: 'fade-up',         name: 'Fade up',          category: 'entry', emoji: '⬆️', desc: 'Monte en fondu' },
  { id: 'fade-down',       name: 'Fade down',        category: 'entry', emoji: '⬇️', desc: 'Descend en fondu' },
  { id: 'fade-left',       name: 'Fade left',        category: 'entry', emoji: '⬅️', desc: 'Glisse de la droite' },
  { id: 'fade-right',      name: 'Fade right',       category: 'entry', emoji: '➡️', desc: 'Glisse de la gauche' },
  { id: 'zoom-in',         name: 'Zoom in',          category: 'entry', emoji: '🔍', desc: 'Zoom avant' },
  { id: 'zoom-out',        name: 'Zoom out',         category: 'entry', emoji: '🔭', desc: 'Zoom arrière' },
  { id: 'slide-up',        name: 'Slide up',         category: 'entry', emoji: '🚀', desc: 'Monte sec' },
  { id: 'slide-down',      name: 'Slide down',       category: 'entry', emoji: '🪂', desc: 'Tombe sec' },
  { id: 'flip-x',          name: 'Flip X',           category: 'entry', emoji: '🪞', desc: 'Rotation horizontale' },
  { id: 'flip-y',          name: 'Flip Y',           category: 'entry', emoji: '🔄', desc: 'Rotation verticale' },
  { id: 'rotate-in',       name: 'Rotate in',        category: 'entry', emoji: '🌀', desc: 'Tourne en arrivant' },
  { id: 'blur-in',         name: 'Blur in',          category: 'entry', emoji: '💨', desc: 'Sort du flou' },
  { id: 'bounce-in',       name: 'Bounce in',        category: 'entry', emoji: '🏀', desc: 'Atterrit en rebondissant', intensity: 'medium' },
  { id: 'elastic-in',      name: 'Elastic in',       category: 'entry', emoji: '🪀', desc: 'Effet élastique', intensity: 'medium' },
  { id: 'jelly-in',        name: 'Jelly in',         category: 'entry', emoji: '🍮', desc: 'Gélatineux', intensity: 'medium' },
  { id: 'rubber-in',       name: 'Rubber in',        category: 'entry', emoji: '🎈', desc: 'Caoutchouc' },
  { id: 'swing-in',        name: 'Swing in',         category: 'entry', emoji: '🪅', desc: 'Balance' },
  { id: 'tada-in',         name: 'Tada !',           category: 'entry', emoji: '🎉', desc: 'Apparition spectaculaire', intensity: 'wow' },
  { id: 'wow-arrival',     name: 'Wow arrival',      category: 'entry', emoji: '✨', desc: 'Combo spectaculaire 3D + glow', intensity: 'wow' },

  // ─── HOVER (15) ─────────────────────────────────────────
  { id: 'lift',            name: 'Lift',             category: 'hover', emoji: '🏋️', desc: 'Soulève + ombre' },
  { id: 'tilt-3d',         name: 'Tilt 3D',          category: 'hover', emoji: '🎴', desc: '3D selon souris', intensity: 'medium' },
  { id: 'glow',            name: 'Glow',             category: 'hover', emoji: '💡', desc: 'Halo lumineux' },
  { id: 'shake',           name: 'Shake',            category: 'hover', emoji: '🥶', desc: 'Tremblement' },
  { id: 'swing',           name: 'Swing',            category: 'hover', emoji: '🎢', desc: 'Balance latérale' },
  { id: 'magnetic',        name: 'Magnetic',         category: 'hover', emoji: '🧲', desc: 'Suit le curseur', intensity: 'medium' },
  { id: 'magnify',         name: 'Magnify',          category: 'hover', emoji: '🔬', desc: 'Grossit' },
  { id: 'pulse',           name: 'Pulse',            category: 'hover', emoji: '💓', desc: 'Pulse continu' },
  { id: 'ripple',          name: 'Ripple',           category: 'hover', emoji: '💧', desc: 'Onde au clic' },
  { id: 'shine',           name: 'Shine',            category: 'hover', emoji: '🌟', desc: 'Reflet qui balaye' },
  { id: 'gradient-shift',  name: 'Gradient shift',   category: 'hover', emoji: '🌈', desc: 'Couleurs qui glissent' },
  { id: 'blur-bg',         name: 'Blur background',  category: 'hover', emoji: '🌫️', desc: 'Floute le fond' },
  { id: 'color-pop',       name: 'Color pop',        category: 'hover', emoji: '🎨', desc: 'Saturation +' },
  { id: 'neon-hover',      name: 'Neon glow',        category: 'hover', emoji: '⚡', desc: 'Bordure néon', intensity: 'wow' },
  { id: 'electric',        name: 'Electric',         category: 'hover', emoji: '🔌', desc: 'Décharge électrique', intensity: 'wow' },

  // ─── SCROLL (15) ────────────────────────────────────────
  { id: 'parallax-bg',     name: 'Parallax fond',    category: 'scroll', emoji: '🏞️', desc: 'Fond glisse plus lentement' },
  { id: 'parallax-deep',   name: 'Parallax profond', category: 'scroll', emoji: '⛰️', desc: '3 layers de profondeur', intensity: 'wow' },
  { id: 'sticky-reveal',   name: 'Sticky reveal',    category: 'scroll', emoji: '📌', desc: "S'épingle puis s'efface" },
  { id: 'stagger-list',    name: 'Stagger list',     category: 'scroll', emoji: '🪜', desc: 'Items en cascade' },
  { id: 'marquee',         name: 'Marquee',          category: 'scroll', emoji: '🎢', desc: 'Défilement horizontal infini' },
  { id: 'ticker',          name: 'Ticker',           category: 'scroll', emoji: '📰', desc: 'Bandeau ticker' },
  { id: 'count-up',        name: 'Count up',         category: 'scroll', emoji: '🔢', desc: 'Compte de 0 à valeur' },
  { id: 'progress-bar',    name: 'Progress bar',     category: 'scroll', emoji: '📊', desc: 'Barre qui se remplit' },
  { id: 'skew-on-scroll',  name: 'Skew scroll',      category: 'scroll', emoji: '📐', desc: 'Penche pendant scroll', intensity: 'medium' },
  { id: 'perspective-tilt',name: 'Perspective tilt', category: 'scroll', emoji: '🎭', desc: 'Bascule 3D au scroll', intensity: 'wow' },
  { id: 'spotlight',       name: 'Spotlight',        category: 'scroll', emoji: '🔦', desc: 'Cercle lumineux suit' },
  { id: 'mask-reveal',     name: 'Mask reveal',      category: 'scroll', emoji: '🎭', desc: 'Apparait via masque' },
  { id: 'clip-reveal',     name: 'Clip reveal',      category: 'scroll', emoji: '✂️', desc: 'Découpe progressive' },
  { id: 'wave-reveal',     name: 'Wave reveal',      category: 'scroll', emoji: '🌊', desc: 'Vague qui révèle' },
  { id: 'rotate-on-scroll',name: 'Rotate scroll',    category: 'scroll', emoji: '🌀', desc: 'Tourne au scroll' },

  // ─── TEXT (15) ──────────────────────────────────────────
  { id: 'typewriter',      name: 'Typewriter',       category: 'text', emoji: '⌨️', desc: 'Tape lettre par lettre' },
  { id: 'glitch',          name: 'Glitch',           category: 'text', emoji: '👾', desc: 'Effet glitch RGB', intensity: 'wow' },
  { id: 'gradient-flow',   name: 'Gradient flow',    category: 'text', emoji: '🌈', desc: 'Couleurs qui coulent' },
  { id: 'neon-glow',       name: 'Neon glow',        category: 'text', emoji: '💡', desc: 'Texte néon' },
  { id: 'fire-text',       name: 'Fire text',        category: 'text', emoji: '🔥', desc: 'Lettres en feu', intensity: 'wow' },
  { id: 'water-text',      name: 'Water text',       category: 'text', emoji: '💧', desc: 'Reflet aquatique' },
  { id: 'shadow-dance',    name: 'Shadow dance',     category: 'text', emoji: '🕺', desc: 'Ombres qui bougent' },
  { id: 'split-letters',   name: 'Split letters',    category: 'text', emoji: '🪄', desc: 'Lettres séparées en 3D' },
  { id: 'scramble',        name: 'Scramble',         category: 'text', emoji: '🔀', desc: 'Lettres aléatoires → texte' },
  { id: 'marquee-text',    name: 'Marquee text',     category: 'text', emoji: '📺', desc: 'Défile à l\'infini' },
  { id: 'fade-letters',    name: 'Fade letters',     category: 'text', emoji: '🌫️', desc: 'Lettres en fondu cascade' },
  { id: 'slide-letters',   name: 'Slide letters',    category: 'text', emoji: '🛹', desc: 'Lettres qui glissent' },
  { id: 'bounce-letters',  name: 'Bounce letters',   category: 'text', emoji: '🏀', desc: 'Lettres rebondissent' },
  { id: 'wave-letters',    name: 'Wave letters',     category: 'text', emoji: '🌊', desc: 'Vague de lettres' },
  { id: 'text-3d',         name: 'Text 3D',          category: 'text', emoji: '🎲', desc: 'Profondeur 3D', intensity: 'wow' },

  // ─── BACKGROUND (15) ────────────────────────────────────
  { id: 'gradient-anime',  name: 'Gradient animé',   category: 'background', emoji: '🌈', desc: 'Couleurs qui coulent' },
  { id: 'mesh-gradient',   name: 'Mesh gradient',    category: 'background', emoji: '🎨', desc: 'Mesh artistique' },
  { id: 'particles-bg',    name: 'Particles',        category: 'background', emoji: '✨', desc: 'Particules flottantes' },
  { id: 'waves-bg',        name: 'Waves',            category: 'background', emoji: '🌊', desc: 'Vagues animées' },
  { id: 'aurora',          name: 'Aurora',           category: 'background', emoji: '🌌', desc: 'Aurore boréale', intensity: 'wow' },
  { id: 'noise-bg',        name: 'Noise',            category: 'background', emoji: '📺', desc: 'Grain animé' },
  { id: 'grid-anime',      name: 'Grid animé',       category: 'background', emoji: '🔲', desc: 'Grille pulsante' },
  { id: 'dots-flow',       name: 'Dots flow',        category: 'background', emoji: '⚪', desc: 'Points qui flottent' },
  { id: 'lines-flow',      name: 'Lines flow',       category: 'background', emoji: '〰️', desc: 'Lignes ondulantes' },
  { id: 'blob-bg',         name: 'Blob',             category: 'background', emoji: '🫧', desc: 'Blobs colorés morphants' },
  { id: 'ripple-bg',       name: 'Ripple',           category: 'background', emoji: '💧', desc: 'Ondes circulaires' },
  { id: 'smoke-bg',        name: 'Smoke',            category: 'background', emoji: '💨', desc: 'Fumée nuageuse' },
  { id: 'geometric',       name: 'Geometric',        category: 'background', emoji: '🔷', desc: 'Formes géométriques' },
  { id: 'halftone',        name: 'Halftone',         category: 'background', emoji: '⚫', desc: 'Style halftone print' },
  { id: 'glitch-bg',       name: 'Glitch BG',        category: 'background', emoji: '👾', desc: 'Glitch écran cathodique', intensity: 'wow' },

  // ─── CARD (10) ──────────────────────────────────────────
  { id: 'card-tilt-3d',    name: 'Card tilt 3D',     category: 'card', emoji: '🎴', desc: 'Tilt 3D + glare' },
  { id: 'magic-card',      name: 'Magic card',       category: 'card', emoji: '🪄', desc: 'Bordure magique', intensity: 'wow' },
  { id: 'gradient-border', name: 'Gradient border',  category: 'card', emoji: '🖼️', desc: 'Contour gradient anime' },
  { id: 'holographic',     name: 'Holographic',      category: 'card', emoji: '💎', desc: 'Hologramme rainbow', intensity: 'wow' },
  { id: 'glow-border',     name: 'Glow border',      category: 'card', emoji: '✨', desc: 'Contour qui brille' },
  { id: 'lift-shadow',     name: 'Lift shadow',      category: 'card', emoji: '☁️', desc: 'Ombre profonde au hover' },
  { id: 'flip-3d',         name: 'Flip 3D',          category: 'card', emoji: '🃏', desc: 'Carte qui se retourne' },
  { id: 'stack-3d',        name: 'Stack 3D',         category: 'card', emoji: '📚', desc: 'Pile de cartes 3D' },
  { id: 'fold',            name: 'Fold',             category: 'card', emoji: '📰', desc: 'Pliage origami' },
  { id: 'wobble',          name: 'Wobble',           category: 'card', emoji: '🎯', desc: 'Tremble doux' },

  // ─── TRANSITION (10) ────────────────────────────────────
  { id: 'morph',           name: 'Morph',            category: 'transition', emoji: '🦋', desc: 'Métamorphose forme' },
  { id: 'page-curl',       name: 'Page curl',        category: 'transition', emoji: '📄', desc: 'Coin qui se plie' },
  { id: 'slide-overlay',   name: 'Slide overlay',    category: 'transition', emoji: '🎬', desc: 'Calque qui glisse' },
  { id: 'dissolve',        name: 'Dissolve',         category: 'transition', emoji: '✨', desc: 'Pixels qui s\'évaporent' },
  { id: 'mask-cut',        name: 'Mask cut',         category: 'transition', emoji: '✂️', desc: 'Découpe en formes' },
  { id: 'ripple-transition', name: 'Ripple transition', category: 'transition', emoji: '💧', desc: 'Onde de transition' },
  { id: 'zoom-fade',       name: 'Zoom fade',        category: 'transition', emoji: '🔍', desc: 'Zoom + fondu' },
  { id: 'blur-fade',       name: 'Blur fade',        category: 'transition', emoji: '🌫️', desc: 'Floute puis disparait' },
  { id: 'push-pull',       name: 'Push pull',        category: 'transition', emoji: '↔️', desc: 'Pousse l\'ancien, tire le nouveau' },
  { id: 'kaleidoscope',    name: 'Kaleidoscope',     category: 'transition', emoji: '🌸', desc: 'Kaléidoscope', intensity: 'wow' }
];

export const EFFECT_CATEGORIES: { id: EffectCategory; label: string; emoji: string; color: string }[] = [
  { id: 'entry',      label: 'Entrée',       emoji: '🚀', color: 'fuchsia' },
  { id: 'hover',      label: 'Hover',         emoji: '🖱️', color: 'violet' },
  { id: 'scroll',    label: 'Scroll',        emoji: '📜', color: 'cyan' },
  { id: 'text',       label: 'Texte',         emoji: '🔤', color: 'amber' },
  { id: 'background', label: 'Background',    emoji: '🎨', color: 'emerald' },
  { id: 'card',       label: 'Cards',         emoji: '🎴', color: 'rose' },
  { id: 'transition', label: 'Transition',    emoji: '🎬', color: 'sky' },
  { id: 'reveal',     label: 'Reveal',        emoji: '🎭', color: 'orange' }
];

export function getEffectsByCategory(cat: EffectCategory): Effect[] {
  return EFFECTS.filter((e) => e.category === cat);
}

export function getEffect(id: string): Effect | undefined {
  return EFFECTS.find((e) => e.id === id);
}
