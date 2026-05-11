/**
 * Design tokens partagés Pixeesite — style "gradient bold" inspiré GLD.
 * Toutes les pages doivent utiliser ces tokens pour cohérence visuelle.
 */

export const colors = {
  bg: '#0a0a0f',
  bgCard: '#18181b',
  bgCardHover: '#1f1f25',
  border: '#27272a',
  borderLight: '#3f3f46',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textDim: '#71717a',
  primary: '#d946ef',
  primaryLight: '#e879f9',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  violet: '#8b5cf6',
  pink: '#ec4899',
};

export const gradients = {
  pink: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
  green: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
  orange: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  brand: 'linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)',
  brandSoft: 'linear-gradient(135deg, #d946ef33 0%, #06b6d433 100%)',
  banner: 'linear-gradient(135deg, #d946ef 0%, #8b5cf6 50%, #06b6d4 100%)',
  bannerSoft: 'linear-gradient(135deg, #d946ef44 0%, #8b5cf644 50%, #06b6d444 100%)',
};

// Pour les stats cards : couleurs cyclables
export const statGradients = [
  gradients.pink, gradients.blue, gradients.purple,
  gradients.green, gradients.orange, gradients.brand,
];

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.5)',
  md: '0 4px 12px rgba(0,0,0,0.4)',
  lg: '0 10px 30px rgba(0,0,0,0.5)',
  glow: '0 0 30px rgba(217,70,239,0.3)',
};

export const radii = { sm: 6, md: 10, lg: 14, xl: 20 };

export const fonts = {
  sans: 'Inter, -apple-system, system-ui, sans-serif',
  mono: 'JetBrains Mono, Menlo, monospace',
};

// Styles helpers
export const styles = {
  pageWrap: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 8px',
  } as React.CSSProperties,
  banner: (emoji: string, title: string, desc?: string) => ({
    background: gradients.banner,
    borderRadius: radii.lg,
    padding: '20px 24px',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow: shadows.md,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  } as React.CSSProperties),
  bannerEmoji: {
    width: 64, height: 64,
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    borderRadius: radii.md,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 32,
  } as React.CSSProperties,
  bannerTitle: { fontSize: 28, fontWeight: 800, margin: 0, color: 'white' } as React.CSSProperties,
  bannerDesc: { fontSize: 13, opacity: 0.9, marginTop: 4, color: 'white' } as React.CSSProperties,

  statCard: (gradient: string): React.CSSProperties => ({
    background: gradient,
    borderRadius: radii.lg,
    padding: 18,
    color: 'white',
    boxShadow: shadows.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 120,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'transform .15s, box-shadow .15s',
    cursor: 'default',
  }),
  statValue: { fontSize: 30, fontWeight: 800, lineHeight: 1 } as React.CSSProperties,
  statLabel: { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, opacity: 0.95, marginTop: 'auto' } as React.CSSProperties,
  statIcon: { fontSize: 22, opacity: 0.9 } as React.CSSProperties,

  sectionTitle: { fontSize: 11, opacity: 0.6, textTransform: 'uppercase' as const, letterSpacing: 1.5, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties,

  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.lg,
    padding: 16,
  } as React.CSSProperties,

  btnPrimary: {
    background: gradients.brand,
    color: 'white', border: 0,
    padding: '10px 18px', borderRadius: radii.md,
    fontWeight: 700, cursor: 'pointer',
    fontSize: 13,
    boxShadow: '0 4px 12px rgba(217,70,239,0.4)',
    transition: 'transform .15s',
  } as React.CSSProperties,
  btnSecondary: {
    background: colors.bgCard, color: colors.text,
    border: `1px solid ${colors.borderLight}`,
    padding: '10px 18px', borderRadius: radii.md,
    fontWeight: 600, cursor: 'pointer',
    fontSize: 13,
  } as React.CSSProperties,
  btnGhost: {
    background: 'transparent', color: colors.textMuted,
    border: 0,
    padding: '6px 10px', borderRadius: radii.sm,
    fontSize: 13, cursor: 'pointer',
  } as React.CSSProperties,
};
