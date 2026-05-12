/**
 * Theme system Pixeesite — CSS vars partagées par tous les blocs.
 *
 * Chaque tenant a son thème (Org.primaryColor, Org.font + override par Site.theme).
 * On injecte les variables CSS au top du <main> et tous les blocs en héritent.
 *
 * Usage:
 *   <ThemeProvider theme={{ primary: '#d946ef', font: 'Inter' }}>
 *     <PageBlocksRenderer blocks={...} />
 *   </ThemeProvider>
 */
import type { ReactNode, CSSProperties } from 'react';

/** Fonts Google Fonts whitelistées. Chargées dynamiquement via <GoogleFontsLoader>. */
export const FONT_WHITELIST = [
  'Inter', 'Poppins', 'Playfair Display', 'DM Sans', 'Manrope',
  'Bricolage Grotesque', 'Outfit', 'Fraunces', 'Cormorant Garamond',
  'Space Grotesk', 'Plus Jakarta Sans', 'Lora', 'Marcellus', 'Cinzel',
] as const;

export interface SiteTheme {
  /** Couleur primaire — boutons, accents */
  primary?: string;
  /** Couleur secondaire — accents secondaires */
  secondary?: string;
  /** Couleur d'accent (3e couleur) */
  accent?: string;
  /** Background principal */
  background?: string;
  /** Couleur du texte */
  foreground?: string;
  /** Font pour les titres (Google Fonts ou stack système) */
  fontHeading?: string;
  /** Font pour le body */
  fontBody?: string;
  /** Nom brut Google Fonts pour le heading (chargé dynamiquement). */
  fontHeadingName?: string;
  /** Nom brut Google Fonts pour le body (chargé dynamiquement). */
  fontBodyName?: string;
  /** Border radius global (rem ou px) */
  radius?: string;
  /** Spacing system : compact / comfortable / spacious */
  spacing?: 'compact' | 'comfortable' | 'spacious';
}

const DEFAULT_THEME: Required<SiteTheme> = {
  primary: '#d946ef',
  secondary: '#06b6d4',
  accent: '#f59e0b',
  background: '#0a0a0f',
  foreground: '#fafafa',
  fontHeading: '"Playfair Display", Georgia, serif',
  fontBody: '"Inter", system-ui, -apple-system, sans-serif',
  radius: '1rem',
  spacing: 'comfortable',
};

/**
 * Convertit un theme partial en variables CSS.
 * Fallback sur DEFAULT_THEME pour les valeurs manquantes.
 */
export function themeToCssVars(theme?: SiteTheme | null): CSSProperties {
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const spacingScale = {
    compact: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    comfortable: { xs: '0.5rem', sm: '1rem', md: '2rem', lg: '3rem', xl: '4rem' },
    spacious: { xs: '0.75rem', sm: '1.5rem', md: '3rem', lg: '5rem', xl: '7rem' },
  }[t.spacing];

  return {
    // @ts-expect-error CSS vars custom
    '--pxs-primary': t.primary,
    '--pxs-secondary': t.secondary,
    '--pxs-accent': t.accent,
    '--pxs-background': t.background,
    '--pxs-foreground': t.foreground,
    '--pxs-font-heading': t.fontHeading,
    '--pxs-font-body': t.fontBody,
    '--pxs-radius': t.radius,
    '--pxs-spacing-xs': spacingScale.xs,
    '--pxs-spacing-sm': spacingScale.sm,
    '--pxs-spacing-md': spacingScale.md,
    '--pxs-spacing-lg': spacingScale.lg,
    '--pxs-spacing-xl': spacingScale.xl,
  };
}

/**
 * Wrapper qui injecte les CSS vars du theme sur tous ses descendants.
 */
export function ThemeProvider({ theme, children, className = '' }: {
  theme?: SiteTheme | null;
  children: ReactNode;
  className?: string;
}) {
  const vars = themeToCssVars(theme);
  return (
    <div
      className={className}
      style={{
        ...vars,
        background: 'var(--pxs-background)',
        color: 'var(--pxs-foreground)',
        fontFamily: 'var(--pxs-font-body)',
      }}
    >
      {children}
    </div>
  );
}

/** Récupère un theme avec fallback complet (utile pour les calculs côté serveur). */
export function resolveTheme(theme?: SiteTheme | null): Required<SiteTheme> {
  return { ...DEFAULT_THEME, ...(theme || {}) };
}

/**
 * Charge dynamiquement les Google Fonts demandées par le theme.
 *
 * Lit `theme.fontHeadingName` + `theme.fontBodyName` (champs bruts type "Inter"
 * "Playfair Display"). Seuls les noms dans FONT_WHITELIST sont chargés.
 *
 * Rendu côté serveur (Next.js Server Component compatible) : on émet
 * <link rel="stylesheet" ...> que le navigateur récupère avant le rendu visuel.
 */
export function GoogleFontsLoader({ theme }: { theme?: SiteTheme | null }) {
  const allowed = new Set<string>(FONT_WHITELIST as readonly string[]);
  const fonts = new Set<string>();
  if (theme?.fontHeadingName && allowed.has(theme.fontHeadingName)) fonts.add(theme.fontHeadingName);
  if (theme?.fontBodyName && allowed.has(theme.fontBodyName)) fonts.add(theme.fontBodyName);
  // Tente aussi d'extraire le 1er token du stack fontHeading / fontBody si fourni brut
  const tryExtract = (stack?: string) => {
    if (!stack) return;
    const first = stack.split(',')[0]?.trim().replace(/^["']|["']$/g, '');
    if (first && allowed.has(first)) fonts.add(first);
  };
  tryExtract(theme?.fontHeading);
  tryExtract(theme?.fontBody);
  if (fonts.size === 0) return null;

  const families = Array.from(fonts)
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700;800;900`)
    .join('&');
  const href = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  return <link rel="stylesheet" href={href} />;
}

/** 5 thèmes pré-built que les utilisateurs peuvent appliquer en 1 clic. */
export const THEME_PRESETS: Record<string, SiteTheme> = {
  fuchsia: {
    primary: '#d946ef', secondary: '#06b6d4', accent: '#f59e0b',
    background: '#0a0a0f', foreground: '#fafafa',
  },
  ocean: {
    primary: '#0ea5e9', secondary: '#10b981', accent: '#f97316',
    background: '#0c1524', foreground: '#f0f9ff',
  },
  rose: {
    primary: '#ec4899', secondary: '#f43f5e', accent: '#fbbf24',
    background: '#1a0f14', foreground: '#fff1f2',
  },
  forest: {
    primary: '#10b981', secondary: '#84cc16', accent: '#fbbf24',
    background: '#0a0f0d', foreground: '#f0fdf4',
  },
  monochrome: {
    primary: '#fafafa', secondary: '#a1a1aa', accent: '#fafafa',
    background: '#09090b', foreground: '#fafafa',
    fontHeading: '"Helvetica Neue", system-ui, sans-serif',
    fontBody: '"Helvetica Neue", system-ui, sans-serif',
  },
};
