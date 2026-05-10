'use client';
import { ReactNode } from 'react';
import { EffectWrapper } from './EffectWrapper';
import { ParallaxHero } from './ParallaxHero';
import { ParallaxSlider } from './ParallaxSlider';
import { ThemeProvider, type SiteTheme } from './Theme';

export interface Block {
  id?: string;
  position?: number;
  width?: string;
  height?: string;
  type: string;
  data: any;
  effect?: string | null;
  effectDelay?: number | null;
  visible?: boolean;
}

const WIDTH_CLASS: Record<string, string> = {
  '1/4': 'pxs-w-1-4',
  '1/3': 'pxs-w-1-3',
  '1/2': 'pxs-w-1-2',
  '2/3': 'pxs-w-2-3',
  '3/4': 'pxs-w-3-4',
  full: 'pxs-w-full',
};

const FULL_BLEED_TYPES = new Set(['parallax-hero', 'parallax-slider']);

interface RendererProps {
  blocks: Block[];
  theme?: SiteTheme | null;
  className?: string;
}

/**
 * Rendu d'un tableau de blocs (= contenu de SitePage.blocks JSON).
 * Wrap avec <ThemeProvider> pour injecter les CSS vars.
 */
export function PageBlocksRenderer({ blocks, theme, className = '' }: RendererProps) {
  // Filter visible
  const visible = blocks.filter((b) => b.visible !== false);

  // Sépare les blocs full-bleed (qui sortent du container) des blocs normaux
  const elements: ReactNode[] = [];
  let group: Block[] = [];

  function flushGroup() {
    if (group.length === 0) return;
    elements.push(
      <div key={`grp-${elements.length}`} className="pxs-container pxs-py-md">
        <div className="pxs-row">
          {group.map((b, i) => (
            <div key={`${b.id || i}-${b.position || i}`} className={`${WIDTH_CLASS[b.width || 'full'] || 'pxs-w-full'} pxs-col`}>
              <EffectWrapper effect={b.effect || undefined} delay={b.effectDelay || 0}>
                <BlockRenderer block={b} />
              </EffectWrapper>
            </div>
          ))}
        </div>
      </div>
    );
    group = [];
  }

  visible.forEach((b, i) => {
    if (FULL_BLEED_TYPES.has(b.type)) {
      flushGroup();
      elements.push(
        <EffectWrapper key={`fb-${i}`} effect={b.effect || undefined} delay={b.effectDelay || 0} as="section">
          <BlockRenderer block={b} />
        </EffectWrapper>
      );
    } else {
      group.push(b);
    }
  });
  flushGroup();

  return (
    <ThemeProvider theme={theme} className={className}>
      {/* Inline minimal CSS pour container/cols (pas de Tailwind dans le rendu public) */}
      <style dangerouslySetInnerHTML={{ __html: PXS_LAYOUT_CSS }} />
      {elements}
    </ThemeProvider>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const d = block.data || {};

  switch (block.type) {
    case 'text':
      return <div className="pxs-prose" dangerouslySetInnerHTML={{ __html: d.html || '' }} />;

    case 'image':
      if (!d.src) return null;
      return <img src={d.src} alt={d.alt || ''} className="pxs-img" />;

    case 'video':
      if (!d.src) return null;
      if (d.src.includes('youtube.com') || d.src.includes('youtu.be')) {
        const id = d.src.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
        return id ? <iframe src={`https://www.youtube.com/embed/${id}`} className="pxs-iframe" allowFullScreen /> : null;
      }
      return <video src={d.src} controls className="pxs-img" />;

    case 'cta':
      return (
        <div className="pxs-cta">
          <a href={d.href || '#'} className="pxs-button-primary">{d.label || 'Cliquer'}</a>
        </div>
      );

    case 'hero':
      return (
        <div
          className="pxs-hero"
          style={d.bgImage ? { background: `url(${d.bgImage}) center/cover` } : undefined}
        >
          <div className="pxs-hero-overlay" />
          <div className="pxs-hero-content">
            <h1 className="pxs-h1">{d.title}</h1>
            {d.subtitle && <p className="pxs-hero-subtitle">{d.subtitle}</p>}
            {d.cta?.label && <a href={d.cta?.href || '#'} className="pxs-button-light">{d.cta.label}</a>}
          </div>
        </div>
      );

    case 'parallax-hero':
      return (
        <ParallaxHero
          title={d.title || ''}
          subtitle={d.subtitle}
          ctaLabel={d.ctaLabel}
          ctaHref={d.ctaHref}
          bgImage={d.bgImage}
          bgGradient={d.bgGradient}
          midImage={d.midImage}
          fgImage={d.fgImage}
          overlayColor={d.overlayColor}
          floatingText={d.floatingText}
          height={d.height || '90vh'}
        />
      );

    case 'parallax-slider':
      if (!Array.isArray(d.slides) || d.slides.length === 0) return null;
      return (
        <ParallaxSlider
          slides={d.slides}
          height={d.height || '85vh'}
          autoplay={d.autoplay !== false}
          autoplayDelay={d.autoplayDelay || 6500}
        />
      );

    case 'columns':
      if (!Array.isArray(d.columns)) return null;
      return (
        <div className={`pxs-columns pxs-columns-${Math.min(d.columns.length, 4)}`}>
          {d.columns.map((c: any, i: number) => (
            <div key={i} className="pxs-prose" dangerouslySetInnerHTML={{ __html: c.html || '' }} />
          ))}
        </div>
      );

    case 'embed':
      return <div dangerouslySetInnerHTML={{ __html: d.html || '' }} />;

    case 'spacer':
      return <div style={{ height: d.height || 60 }} />;

    default:
      console.warn(`[pixeesite] Unknown block type: ${block.type}`);
      return null;
  }
}

const PXS_LAYOUT_CSS = `
.pxs-container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 var(--pxs-spacing-md); }
.pxs-py-md { padding-top: var(--pxs-spacing-lg); padding-bottom: var(--pxs-spacing-lg); }
.pxs-row { display: flex; flex-wrap: wrap; gap: var(--pxs-spacing-md); margin: 0 calc(var(--pxs-spacing-sm) * -1); }
.pxs-col { padding: 0 var(--pxs-spacing-sm); margin-bottom: var(--pxs-spacing-md); }
.pxs-w-full { width: 100%; }
.pxs-w-1-4 { width: 100%; }
.pxs-w-1-3 { width: 100%; }
.pxs-w-1-2 { width: 100%; }
.pxs-w-2-3 { width: 100%; }
.pxs-w-3-4 { width: 100%; }
@media (min-width: 768px) {
  .pxs-w-1-4 { width: 25%; }
  .pxs-w-1-3 { width: 33.333%; }
  .pxs-w-1-2 { width: 50%; }
  .pxs-w-2-3 { width: 66.666%; }
  .pxs-w-3-4 { width: 75%; }
}
.pxs-prose { color: var(--pxs-foreground); font-family: var(--pxs-font-body); line-height: 1.7; }
.pxs-prose h1, .pxs-prose h2, .pxs-prose h3, .pxs-prose h4 { font-family: var(--pxs-font-heading); font-weight: 700; line-height: 1.2; margin-top: 2em; margin-bottom: 0.5em; }
.pxs-prose h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
.pxs-prose h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
.pxs-prose h3 { font-size: clamp(1.25rem, 3vw, 1.875rem); }
.pxs-prose p { margin: 1em 0; }
.pxs-prose strong { color: var(--pxs-primary); font-weight: 700; }
.pxs-prose a { color: var(--pxs-primary); text-decoration: underline; }
.pxs-prose ul, .pxs-prose ol { padding-left: 1.5em; }
.pxs-img { width: 100%; height: auto; border-radius: var(--pxs-radius); display: block; }
.pxs-iframe { width: 100%; aspect-ratio: 16/9; border: 0; border-radius: var(--pxs-radius); }
.pxs-cta { text-align: center; padding: var(--pxs-spacing-md) 0; }
.pxs-button-primary {
  display: inline-block;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white; font-weight: 700;
  padding: 0.75em 1.75em; border-radius: 999px; text-decoration: none;
  font-size: 0.95rem; transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8px 24px -8px var(--pxs-primary);
}
.pxs-button-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -8px var(--pxs-primary); }
.pxs-button-light {
  display: inline-block; background: white; color: #18181b;
  font-weight: 700; padding: 0.75em 1.5em; border-radius: 999px; text-decoration: none;
}
.pxs-hero {
  position: relative; border-radius: var(--pxs-radius); overflow: hidden;
  padding: var(--pxs-spacing-xl) var(--pxs-spacing-md); text-align: center;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
}
.pxs-hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); }
.pxs-hero-content { position: relative; z-index: 1; }
.pxs-h1 { font-family: var(--pxs-font-heading); font-size: clamp(2rem, 6vw, 4rem); font-weight: 900; color: white; margin: 0 0 0.5em; }
.pxs-hero-subtitle { color: rgba(255,255,255,0.92); font-size: 1.125rem; max-width: 42rem; margin: 0 auto 1.5em; }
.pxs-columns { display: grid; gap: var(--pxs-spacing-md); }
.pxs-columns-1 { grid-template-columns: 1fr; }
.pxs-columns-2 { grid-template-columns: 1fr; }
.pxs-columns-3 { grid-template-columns: 1fr; }
.pxs-columns-4 { grid-template-columns: 1fr; }
@media (min-width: 768px) {
  .pxs-columns-2 { grid-template-columns: repeat(2, 1fr); }
  .pxs-columns-3 { grid-template-columns: repeat(3, 1fr); }
  .pxs-columns-4 { grid-template-columns: repeat(4, 1fr); }
}
`;
