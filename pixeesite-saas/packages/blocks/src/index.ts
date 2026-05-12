/**
 * @pixeesite/blocks — Library partagée des blocs visuels.
 *
 * Niveau Webflow / Framer en termes d'effets et de qualité.
 *
 *  - 100 effets wahoo (Parallax Stepout, Slider artistique, glitch, neon-glow,
 *    holographic, mask-reveal, gradient-flow, fire-text, water-text, etc.)
 *  - Theme system avec CSS vars (--pxs-primary, --pxs-font-heading…)
 *  - 5 thèmes pré-built (fuchsia, ocean, rose, forest, monochrome)
 *  - PageBlocksRenderer théme-aware qui consomme un tableau JSON de blocs
 *  - ParallaxHero (style Stepout) + ParallaxSlider (style WordPress artistique)
 *  - Compatible avec le model SitePage de @pixeesite/database (JSON column)
 */

// Effects
export { EFFECTS, EFFECT_CATEGORIES, getEffect, getEffectsByCategory } from './effects-library';
export type { Effect, EffectCategory } from './effects-library';

// Components
export { EffectsStyles, GLD_EFFECTS_CSS } from './EffectsStyles';
export { EffectWrapper } from './EffectWrapper';
export { ParallaxHero } from './ParallaxHero';
export type { ParallaxHeroProps } from './ParallaxHero';
export { ParallaxSlider } from './ParallaxSlider';
export type { ParallaxSlide, ParallaxSliderProps } from './ParallaxSlider';

// Theme
export { ThemeProvider, themeToCssVars, resolveTheme, THEME_PRESETS, GoogleFontsLoader, FONT_WHITELIST } from './Theme';
export type { SiteTheme } from './Theme';

// Renderer
export { PageBlocksRenderer, BLOCK_TYPES } from './PageBlocksRenderer';
export type { Block, BlockType } from './PageBlocksRenderer';

export const PIXEESITE_BLOCKS_VERSION = '0.2.0';
