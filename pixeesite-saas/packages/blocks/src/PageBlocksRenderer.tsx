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

/**
 * Liste complète des 22 types de blocs disponibles :
 *  Anciens (10) :
 *   - text, image, video, cta, hero, parallax-hero, parallax-slider, columns, embed, spacer
 *  Nouveaux (12) :
 *   - gallery, pricing, testimonials, faq, counters, team, services,
 *     timeline, marquee, cta-banner, logo-cloud, feature-grid
 */
export const BLOCK_TYPES = [
  'text', 'image', 'video', 'cta', 'hero', 'parallax-hero', 'parallax-slider',
  'columns', 'embed', 'spacer',
  'gallery', 'pricing', 'testimonials', 'faq', 'counters', 'team', 'services',
  'timeline', 'marquee', 'cta-banner', 'logo-cloud', 'feature-grid',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

const WIDTH_CLASS: Record<string, string> = {
  '1/4': 'pxs-w-1-4',
  '1/3': 'pxs-w-1-3',
  '1/2': 'pxs-w-1-2',
  '2/3': 'pxs-w-2-3',
  '3/4': 'pxs-w-3-4',
  full: 'pxs-w-full',
};

/** Blocs qui sortent du container (full-bleed) — rendus seuls sur toute la largeur. */
const FULL_BLEED_TYPES = new Set([
  'parallax-hero', 'parallax-slider',
  'marquee', 'cta-banner', 'logo-cloud',
  'gallery', 'pricing', 'testimonials', 'faq',
  'counters', 'team', 'services', 'timeline', 'feature-grid',
]);

interface RendererProps {
  blocks: Block[];
  theme?: SiteTheme | null;
  className?: string;
}

/**
 * Rendu d'un tableau de blocs (= contenu de SitePage.blocks JSON).
 * Wrap avec <ThemeProvider> pour injecter les CSS vars.
 *
 * Anim : chaque bloc reçoit `pxs-reveal` qui le fait fade-up au scroll (IntersectionObserver
 * dans EffectWrapper / CSS pure ici). Stagger automatique via delay incrémental.
 */
export function PageBlocksRenderer({ blocks, theme, className = '' }: RendererProps) {
  const visible = blocks.filter((b) => b.visible !== false);

  const elements: ReactNode[] = [];
  let group: Block[] = [];

  function flushGroup() {
    if (group.length === 0) return;
    elements.push(
      <div key={`grp-${elements.length}`} className="pxs-container pxs-py-md">
        <div className="pxs-row">
          {group.map((b, i) => (
            <div
              key={`${b.id || i}-${b.position || i}`}
              className={`${WIDTH_CLASS[b.width || 'full'] || 'pxs-w-full'} pxs-col pxs-reveal`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
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
        <section
          key={`fb-${i}`}
          className="pxs-full-bleed pxs-reveal"
          style={{ transitionDelay: `${(i % 4) * 80}ms` }}
        >
          <EffectWrapper effect={b.effect || undefined} delay={b.effectDelay || 0}>
            <BlockRenderer block={b} />
          </EffectWrapper>
        </section>
      );
    } else {
      group.push(b);
    }
  });
  flushGroup();

  return (
    <ThemeProvider theme={theme} className={className}>
      <style dangerouslySetInnerHTML={{ __html: PXS_LAYOUT_CSS }} />
      {elements}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              if(typeof window==='undefined') return;
              function init(){
                var els=document.querySelectorAll('.pxs-reveal:not(.is-in)');
                if(!('IntersectionObserver' in window)){
                  els.forEach(function(e){ e.classList.add('is-in'); });
                  return;
                }
                var io=new IntersectionObserver(function(entries){
                  entries.forEach(function(en){
                    if(en.isIntersecting){
                      en.target.classList.add('is-in');
                      io.unobserve(en.target);
                    }
                  });
                },{threshold:0.12, rootMargin:'0px 0px -8% 0px'});
                els.forEach(function(e){ io.observe(e); });
              }
              if(document.readyState==='loading'){
                document.addEventListener('DOMContentLoaded', init);
              } else { init(); }
            })();
          `,
        }}
      />
    </ThemeProvider>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const d = block.data || {};

  switch (block.type) {
    case 'text': {
      const html = d.html?.trim() || '';
      if (!html) {
        return (
          <div className="pxs-prose pxs-prose-storytelling">
            <p>Cette section accueillera bientôt votre histoire.</p>
          </div>
        );
      }
      return <div className="pxs-prose pxs-prose-storytelling" dangerouslySetInnerHTML={{ __html: html }} />;
    }

    case 'image': {
      if (!d.src) {
        return (
          <figure className="pxs-image-fallback">
            <div className="pxs-image-skeleton" aria-hidden />
            {d.caption && <figcaption className="pxs-image-caption">{d.caption}</figcaption>}
          </figure>
        );
      }
      return (
        <figure className="pxs-image-wrap">
          <img src={d.src} alt={d.alt || ''} className="pxs-img" loading="lazy" decoding="async" />
          {d.caption && <figcaption className="pxs-image-caption">{d.caption}</figcaption>}
        </figure>
      );
    }

    case 'video':
      if (!d.src) return null;
      if (d.src.includes('youtube.com') || d.src.includes('youtu.be')) {
        const id = d.src.match(/(?:v=|youtu\.be\/)([\w-]{11})/)?.[1];
        return id ? <iframe src={`https://www.youtube.com/embed/${id}`} className="pxs-iframe" allowFullScreen /> : null;
      }
      return <video src={d.src} controls className="pxs-img" />;

    case 'cta':
      return (
        <div className="pxs-cta pxs-cta-rich">
          {d.title && <h2 className="pxs-cta-title">{d.title}</h2>}
          {d.subtitle && <p className="pxs-cta-subtitle">{d.subtitle}</p>}
          <a href={d.href || '#'} className="pxs-button-primary pxs-button-large">{d.label || 'Découvrir'}</a>
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
            <h1 className="pxs-h1">{d.title || 'Bienvenue'}</h1>
            {d.subtitle && <p className="pxs-hero-subtitle">{d.subtitle}</p>}
            {d.cta?.label && <a href={d.cta?.href || '#'} className="pxs-button-light">{d.cta.label}</a>}
          </div>
        </div>
      );

    case 'parallax-hero':
      return (
        <ParallaxHero
          title={d.title || 'Bienvenue'}
          subtitle={d.subtitle}
          ctaLabel={d.ctaLabel}
          ctaHref={d.ctaHref}
          bgImage={d.bgImage}
          bgGradient={
            d.bgGradient ||
            (!d.bgImage
              ? 'linear-gradient(135deg, var(--pxs-primary, #d946ef) 0%, var(--pxs-secondary, #06b6d4) 100%)'
              : undefined)
          }
          midImage={d.midImage}
          fgImage={d.fgImage}
          overlayColor={d.overlayColor}
          floatingText={d.floatingText}
          height={d.height || '90vh'}
        />
      );

    case 'parallax-slider': {
      if (!Array.isArray(d.slides) || d.slides.length === 0) return null;
      if (d.slides.length === 1) {
        const s = d.slides[0];
        return (
          <ParallaxHero
            title={s.title || ''}
            subtitle={s.subtitle}
            ctaLabel={s.ctaLabel}
            ctaHref={s.ctaHref}
            bgImage={s.image}
            bgGradient={
              !s.image
                ? 'linear-gradient(135deg, var(--pxs-primary, #d946ef) 0%, var(--pxs-secondary, #06b6d4) 100%)'
                : undefined
            }
            height={d.height || '85vh'}
          />
        );
      }
      return (
        <ParallaxSlider
          slides={d.slides}
          height={d.height || '85vh'}
          autoplay={d.autoplay !== false}
          autoplayDelay={d.autoplayDelay || 6500}
        />
      );
    }

    case 'columns': {
      if (!Array.isArray(d.columns) || d.columns.length === 0) return null;
      const n = Math.min(d.columns.length, 4);
      return (
        <div className={`pxs-columns pxs-columns-${n}`}>
          {d.columns.map((c: any, i: number) => {
            const html = c?.html?.trim() || '';
            const hasIcon = !!c?.icon;
            return (
              <div key={i} className="pxs-col-card" style={{ animationDelay: `${i * 60}ms` }}>
                {hasIcon && <div className="pxs-col-icon" aria-hidden>{c.icon}</div>}
                {html ? (
                  <div className="pxs-prose pxs-prose-card" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <div className="pxs-prose pxs-prose-card">
                    {c?.title && <h3>{c.title}</h3>}
                    {c?.body && <p>{c.body}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    case 'embed':
      if (d.html?.trim()) return <div className="pxs-embed" dangerouslySetInnerHTML={{ __html: d.html }} />;
      if (d.src) {
        return <iframe src={d.src} className="pxs-iframe" allowFullScreen />;
      }
      return null;

    case 'spacer':
      return <div style={{ height: d.height || 60 }} />;

    // ─────────── NOUVEAUX BLOCS (12) ───────────

    case 'gallery':
      return <GalleryBlock data={d} />;

    case 'pricing':
      return <PricingBlock data={d} />;

    case 'testimonials':
      return <TestimonialsBlock data={d} />;

    case 'faq':
      return <FaqBlock data={d} />;

    case 'counters':
      return <CountersBlock data={d} />;

    case 'team':
      return <TeamBlock data={d} />;

    case 'services':
      return <ServicesBlock data={d} />;

    case 'timeline':
      return <TimelineBlock data={d} />;

    case 'marquee':
      return <MarqueeBlock data={d} />;

    case 'cta-banner':
      return <CtaBannerBlock data={d} />;

    case 'logo-cloud':
      return <LogoCloudBlock data={d} />;

    case 'feature-grid':
      return <FeatureGridBlock data={d} />;

    default:
      console.warn(`[pixeesite] Unknown block type: ${block.type}`);
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────
//  Composants des 12 nouveaux blocs
// ─────────────────────────────────────────────────────────────────

function GalleryBlock({ data }: { data: any }) {
  const images: Array<{ src?: string; alt?: string; category?: string }> = Array.isArray(data.images) ? data.images : [];
  const categories: string[] = Array.isArray(data.categories) && data.categories.length > 0
    ? ['Tous', ...data.categories]
    : [];
  const galleryId = `gal-${Math.random().toString(36).slice(2, 8)}`;

  if (images.length === 0) return null;

  return (
    <div className="pxs-section pxs-gallery" id={galleryId}>
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        {categories.length > 0 && (
          <div className="pxs-filter-bar" role="tablist" aria-label="Filtres galerie">
            {categories.map((c, i) => (
              <button key={c} className={`pxs-filter-btn ${i === 0 ? 'is-active' : ''}`} type="button" data-cat={c}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="pxs-gallery-grid">
          {images.slice(0, 12).map((im, i) => (
            <figure key={i} className="pxs-gallery-item" data-cat={im.category || 'Tous'} style={{ animationDelay: `${i * 50}ms` }}>
              {im.src ? (
                <img src={im.src} alt={im.alt || ''} loading="lazy" decoding="async" />
              ) : (
                <div className="pxs-image-skeleton" aria-hidden />
              )}
              {im.alt && <figcaption className="pxs-gallery-caption">{im.alt}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
      {categories.length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var root=document.getElementById('${galleryId}'); if(!root) return;
                var btns=root.querySelectorAll('.pxs-filter-btn');
                var items=root.querySelectorAll('.pxs-gallery-item');
                btns.forEach(function(b){
                  b.addEventListener('click',function(){
                    btns.forEach(function(x){x.classList.remove('is-active')});
                    b.classList.add('is-active');
                    var cat=b.getAttribute('data-cat');
                    items.forEach(function(it){
                      var ok=cat==='Tous'||it.getAttribute('data-cat')===cat;
                      it.style.display = ok ? '' : 'none';
                    });
                  });
                });
              })();
            `,
          }}
        />
      )}
    </div>
  );
}

function PricingBlock({ data }: { data: any }) {
  const plans: Array<any> = Array.isArray(data.plans) ? data.plans : [];
  if (plans.length === 0) return null;
  const toggleId = `tg-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="pxs-section pxs-pricing">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        {data.subtitle && <p className="pxs-section-subtitle">{data.subtitle}</p>}
        <div className="pxs-pricing-toggle" id={toggleId} aria-label="Période de facturation" role="tablist">
          <button type="button" className="pxs-pricing-toggle-btn is-active" data-period="monthly">Mensuel</button>
          <button type="button" className="pxs-pricing-toggle-btn" data-period="yearly">Annuel <span className="pxs-badge">-20%</span></button>
        </div>
        <div className="pxs-pricing-grid">
          {plans.slice(0, 4).map((p: any, i: number) => (
            <article key={i} className={`pxs-pricing-card ${p.highlight ? 'is-highlight' : ''}`} style={{ animationDelay: `${i * 80}ms` }}>
              {p.highlight && <div className="pxs-pricing-tag">Recommandé</div>}
              <h3 className="pxs-pricing-name">{p.name || 'Plan'}</h3>
              <div className="pxs-pricing-price">
                <span className="pxs-pricing-amount" data-monthly={p.price || ''} data-yearly={p.yearlyPrice || (p.price ? Math.round((Number(String(p.price).replace(/[^\d]/g, '')) || 0) * 0.8) : '')}>{p.price || '—'}</span>
                <span className="pxs-pricing-period">{p.period || '/mois'}</span>
              </div>
              {p.description && <p className="pxs-pricing-desc">{p.description}</p>}
              <ul className="pxs-pricing-features">
                {(Array.isArray(p.features) ? p.features : []).slice(0, 8).map((f: string, k: number) => (
                  <li key={k}><span className="pxs-check" aria-hidden>✓</span> {f}</li>
                ))}
              </ul>
              <a href={p.ctaHref || '/contact'} className={p.highlight ? 'pxs-button-primary pxs-button-large pxs-button-block' : 'pxs-button-outline pxs-button-block'}>
                {p.ctaLabel || 'Choisir'}
              </a>
            </article>
          ))}
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var root=document.getElementById('${toggleId}'); if(!root) return;
              var section=root.closest('.pxs-pricing'); if(!section) return;
              root.querySelectorAll('.pxs-pricing-toggle-btn').forEach(function(b){
                b.addEventListener('click',function(){
                  root.querySelectorAll('.pxs-pricing-toggle-btn').forEach(function(x){x.classList.remove('is-active')});
                  b.classList.add('is-active');
                  var per=b.getAttribute('data-period');
                  section.querySelectorAll('.pxs-pricing-amount').forEach(function(a){
                    var v=a.getAttribute(per==='yearly'?'data-yearly':'data-monthly');
                    if(v) a.textContent=v;
                  });
                  section.querySelectorAll('.pxs-pricing-period').forEach(function(p){
                    p.textContent = per==='yearly' ? '/an' : '/mois';
                  });
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}

function TestimonialsBlock({ data }: { data: any }) {
  const items: Array<any> = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;
  const carId = `car-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="pxs-section pxs-testimonials">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        <div className="pxs-testimonials-carousel" id={carId}>
          <div className="pxs-testimonials-track">
            {items.slice(0, 12).map((t: any, i: number) => (
              <article key={i} className="pxs-testimonial-card">
                <div className="pxs-quote-mark" aria-hidden>“</div>
                {typeof t.rating === 'number' && (
                  <div className="pxs-stars" aria-label={`Note ${t.rating}/5`}>
                    {Array.from({ length: 5 }).map((_, k) => (
                      <span key={k} className={k < t.rating ? 'pxs-star is-on' : 'pxs-star'} aria-hidden>★</span>
                    ))}
                  </div>
                )}
                <p className="pxs-testimonial-quote">{t.quote || ''}</p>
                <div className="pxs-testimonial-author">
                  {t.photo ? (
                    <img src={t.photo} alt={t.name || ''} className="pxs-avatar" loading="lazy" />
                  ) : (
                    <div className="pxs-avatar pxs-avatar-placeholder" aria-hidden>{(t.name || '?').charAt(0)}</div>
                  )}
                  <div>
                    <div className="pxs-testimonial-name">{t.name || 'Client'}</div>
                    {t.role && <div className="pxs-testimonial-role">{t.role}</div>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {items.length > 1 && (
            <div className="pxs-carousel-nav">
              <button type="button" className="pxs-carousel-btn" data-dir="-1" aria-label="Précédent">←</button>
              <button type="button" className="pxs-carousel-btn" data-dir="1" aria-label="Suivant">→</button>
            </div>
          )}
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var root=document.getElementById('${carId}'); if(!root) return;
              var track=root.querySelector('.pxs-testimonials-track');
              root.querySelectorAll('.pxs-carousel-btn').forEach(function(b){
                b.addEventListener('click',function(){
                  var dir=Number(b.getAttribute('data-dir'))||1;
                  var w=track.clientWidth*0.85;
                  track.scrollBy({left:dir*w,behavior:'smooth'});
                });
              });
            })();
          `,
        }}
      />
    </div>
  );
}

function FaqBlock({ data }: { data: any }) {
  const items: Array<any> = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;
  const faqId = `faq-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="pxs-section pxs-faq">
      <div className="pxs-container pxs-container-narrow">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        <div className="pxs-faq-list" id={faqId}>
          {items.slice(0, 16).map((it: any, i: number) => (
            <details key={i} className="pxs-faq-item" style={{ animationDelay: `${i * 60}ms` }}>
              <summary className="pxs-faq-q" aria-label={`Question ${i + 1}`}>
                <span>{it.q || ''}</span>
                <span className="pxs-faq-icon" aria-hidden>+</span>
              </summary>
              <div className="pxs-faq-a">{it.a || ''}</div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function CountersBlock({ data }: { data: any }) {
  const items: Array<any> = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;
  const id = `cnt-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="pxs-section pxs-counters">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        <div className="pxs-counters-grid" id={id}>
          {items.slice(0, 6).map((it: any, i: number) => (
            <div key={i} className="pxs-counter-item" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="pxs-counter-value" data-target={it.value || 0} data-suffix={it.suffix || ''}>
                0{it.suffix || ''}
              </div>
              <div className="pxs-counter-label">{it.label || ''}</div>
            </div>
          ))}
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var root=document.getElementById('${id}'); if(!root) return;
              var done=false;
              function animate(){
                if(done) return; done=true;
                root.querySelectorAll('.pxs-counter-value').forEach(function(el){
                  var t=parseFloat(el.getAttribute('data-target'))||0;
                  var sx=el.getAttribute('data-suffix')||'';
                  var d=1400, start=performance.now();
                  function step(now){
                    var p=Math.min(1,(now-start)/d);
                    var ease=1-Math.pow(1-p,3);
                    var v=t*ease;
                    el.textContent=(t%1===0?Math.round(v):v.toFixed(1))+sx;
                    if(p<1) requestAnimationFrame(step);
                  }
                  requestAnimationFrame(step);
                });
              }
              if('IntersectionObserver' in window){
                var io=new IntersectionObserver(function(ents){
                  ents.forEach(function(e){ if(e.isIntersecting){ animate(); io.disconnect(); }});
                },{threshold:0.3});
                io.observe(root);
              } else { animate(); }
            })();
          `,
        }}
      />
    </div>
  );
}

function TeamBlock({ data }: { data: any }) {
  const members: Array<any> = Array.isArray(data.members) ? data.members : [];
  if (members.length === 0) return null;
  return (
    <div className="pxs-section pxs-team">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        {data.subtitle && <p className="pxs-section-subtitle">{data.subtitle}</p>}
        <div className="pxs-team-grid">
          {members.slice(0, 8).map((m: any, i: number) => (
            <article key={i} className="pxs-team-card" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="pxs-team-photo">
                {m.photo ? (
                  <img src={m.photo} alt={m.name || ''} loading="lazy" decoding="async" />
                ) : (
                  <div className="pxs-image-skeleton" aria-hidden />
                )}
              </div>
              <h3 className="pxs-team-name">{m.name || 'Membre'}</h3>
              {m.role && <div className="pxs-team-role">{m.role}</div>}
              {m.bio && <p className="pxs-team-bio">{m.bio}</p>}
              {m.socials && (
                <div className="pxs-team-socials">
                  {m.socials.linkedin && <a href={m.socials.linkedin} aria-label="LinkedIn" target="_blank" rel="noopener">in</a>}
                  {m.socials.twitter && <a href={m.socials.twitter} aria-label="Twitter" target="_blank" rel="noopener">tw</a>}
                  {m.socials.instagram && <a href={m.socials.instagram} aria-label="Instagram" target="_blank" rel="noopener">ig</a>}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServicesBlock({ data }: { data: any }) {
  const services: Array<any> = Array.isArray(data.services) ? data.services : [];
  if (services.length === 0) return null;
  return (
    <div className="pxs-section pxs-services">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        {data.subtitle && <p className="pxs-section-subtitle">{data.subtitle}</p>}
        <div className="pxs-services-bento">
          {services.slice(0, 8).map((s: any, i: number) => (
            <a
              key={i}
              href={s.link || '#'}
              className={`pxs-service-card ${s.big ? 'is-big' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {s.icon && <div className="pxs-service-icon" aria-hidden>{s.icon}</div>}
              <h3 className="pxs-service-title">{s.title || 'Service'}</h3>
              {s.desc && <p className="pxs-service-desc">{s.desc}</p>}
              <div className="pxs-service-arrow" aria-hidden>→</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineBlock({ data }: { data: any }) {
  const steps: Array<any> = Array.isArray(data.steps) ? data.steps : [];
  if (steps.length === 0) return null;
  return (
    <div className="pxs-section pxs-timeline">
      <div className="pxs-container pxs-container-narrow">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        <ol className="pxs-timeline-list">
          {steps.slice(0, 12).map((s: any, i: number) => (
            <li key={i} className="pxs-timeline-item" style={{ animationDelay: `${i * 90}ms` }}>
              <div className="pxs-timeline-dot" aria-hidden>{s.icon || (i + 1)}</div>
              <div className="pxs-timeline-content">
                {s.date && <div className="pxs-timeline-date">{s.date}</div>}
                <h3 className="pxs-timeline-title">{s.title || ''}</h3>
                {s.desc && <p className="pxs-timeline-desc">{s.desc}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function MarqueeBlock({ data }: { data: any }) {
  const items: Array<any> = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return null;
  const speed = data.speed === 'slow' ? '50s' : data.speed === 'fast' ? '15s' : '28s';
  const variant = data.variant || 'text';
  // double the list for seamless loop
  const doubled = [...items, ...items];
  return (
    <div className={`pxs-marquee pxs-marquee-${variant}`} aria-label="Bandeau défilant" style={{ ['--pxs-marquee-speed' as any]: speed }}>
      <div className="pxs-marquee-track">
        {doubled.map((it: any, i: number) => (
          <span key={i} className="pxs-marquee-item">
            {variant === 'logos' && it?.src ? (
              <img src={it.src} alt={it.alt || ''} loading="lazy" />
            ) : (
              <span>{typeof it === 'string' ? it : (it?.label || it?.text || '')}</span>
            )}
            <span className="pxs-marquee-sep" aria-hidden>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function CtaBannerBlock({ data }: { data: any }) {
  return (
    <div className="pxs-cta-banner" style={data.bgGradient ? { background: data.bgGradient } : undefined}>
      <div className="pxs-cta-mesh" aria-hidden />
      <div className="pxs-container">
        <h2 className="pxs-cta-banner-title">{data.title || 'Prêt à commencer ?'}</h2>
        {data.subtitle && <p className="pxs-cta-banner-subtitle">{data.subtitle}</p>}
        <div className="pxs-cta-banner-actions">
          {data.primaryCta?.label && (
            <a href={data.primaryCta?.href || '#'} className="pxs-button-light pxs-button-large">
              {data.primaryCta.label}
            </a>
          )}
          {data.secondaryCta?.label && (
            <a href={data.secondaryCta?.href || '#'} className="pxs-button-ghost pxs-button-large">
              {data.secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function LogoCloudBlock({ data }: { data: any }) {
  const logos: Array<any> = Array.isArray(data.logos) ? data.logos : [];
  if (logos.length === 0) return null;
  return (
    <div className="pxs-section pxs-logo-cloud">
      <div className="pxs-container">
        {data.title && <p className="pxs-logo-cloud-title">{data.title}</p>}
        <div className="pxs-logo-cloud-grid">
          {logos.slice(0, 12).map((l: any, i: number) => (
            <div key={i} className="pxs-logo-cloud-item" style={{ animationDelay: `${i * 50}ms` }}>
              {l.src ? (
                <img src={l.src} alt={l.alt || `logo-${i}`} loading="lazy" decoding="async" />
              ) : (
                <span className="pxs-logo-placeholder">{l.alt || `Marque ${i + 1}`}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureGridBlock({ data }: { data: any }) {
  const features: Array<any> = Array.isArray(data.features) ? data.features : [];
  if (features.length === 0) return null;
  return (
    <div className="pxs-section pxs-feature-grid-wrap">
      <div className="pxs-container">
        {data.title && <h2 className="pxs-section-title">{data.title}</h2>}
        {data.subtitle && <p className="pxs-section-subtitle">{data.subtitle}</p>}
        <div className="pxs-feature-grid">
          {features.slice(0, 8).map((f: any, i: number) => (
            <article
              key={i}
              className={`pxs-feature-card ${f.span === 2 ? 'is-wide' : ''}`}
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {f.icon && <div className="pxs-feature-icon" aria-hidden>{f.icon}</div>}
              <h3 className="pxs-feature-title">{f.title || ''}</h3>
              {f.desc && <p className="pxs-feature-desc">{f.desc}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CSS global injecté une fois (~ 700 LOC)
// ─────────────────────────────────────────────────────────────────

const PXS_LAYOUT_CSS = `
:root { --pxs-reveal-distance: 28px; }
html { scroll-behavior: smooth; }
.pxs-container { width: 100%; max-width: 1280px; margin: 0 auto; padding: 0 var(--pxs-spacing-md); }
.pxs-container-narrow { max-width: 860px; }
.pxs-py-md { padding-top: var(--pxs-spacing-lg); padding-bottom: var(--pxs-spacing-lg); }
.pxs-section { padding: clamp(4rem, 9vw, 8rem) 0; position: relative; }
.pxs-section-title {
  font-family: var(--pxs-font-heading);
  font-size: clamp(1.875rem, 4.5vw, 3rem);
  font-weight: 800; line-height: 1.1; letter-spacing: -0.02em;
  margin: 0 0 0.4em; text-align: center;
}
.pxs-section-subtitle {
  font-size: clamp(1rem, 1.6vw, 1.15rem); opacity: 0.7;
  max-width: 42rem; margin: 0 auto 3rem; text-align: center; line-height: 1.6;
}
.pxs-full-bleed { display: block; }
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

/* Reveal animation — déclenchée via IntersectionObserver (script global plus bas) */
.pxs-reveal {
  opacity: 0; transform: translateY(var(--pxs-reveal-distance));
  transition: opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1), transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--pxs-reveal-delay, 0ms);
}
.pxs-reveal.is-in {
  opacity: 1; transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .pxs-reveal { opacity: 1; transform: none; transition: none; }
}

/* Prose */
.pxs-prose { color: var(--pxs-foreground); font-family: var(--pxs-font-body); line-height: 1.75; font-size: clamp(1rem, 1.4vw, 1.0625rem); }
.pxs-prose h1, .pxs-prose h2, .pxs-prose h3, .pxs-prose h4 { font-family: var(--pxs-font-heading); font-weight: 700; line-height: 1.15; letter-spacing: -0.015em; margin-top: 2em; margin-bottom: 0.5em; }
.pxs-prose h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
.pxs-prose h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
.pxs-prose h3 { font-size: clamp(1.25rem, 3vw, 1.875rem); }
.pxs-prose p { margin: 1em 0; }
.pxs-prose strong { color: var(--pxs-primary); font-weight: 700; }
.pxs-prose a { color: var(--pxs-primary); text-decoration: underline; text-underline-offset: 3px; }
.pxs-prose ul, .pxs-prose ol { padding-left: 1.5em; }
.pxs-prose-storytelling { max-width: 720px; margin: 0 auto; font-size: clamp(1.0625rem, 1.6vw, 1.1875rem); }
.pxs-prose-card { font-size: 0.9375rem; line-height: 1.65; }
.pxs-prose-card h3 { margin-top: 0; font-size: 1.25rem; }
.pxs-prose-card p { margin: 0.6em 0; opacity: 0.85; }

/* Image */
.pxs-image-wrap { margin: 0; }
.pxs-img {
  width: 100%; height: auto; max-height: 70vh; object-fit: cover;
  border-radius: var(--pxs-radius); display: block;
  background: linear-gradient(135deg, color-mix(in srgb, var(--pxs-primary, #d946ef) 15%, transparent), color-mix(in srgb, var(--pxs-secondary, #06b6d4) 15%, transparent));
}
.pxs-image-caption { margin-top: 0.6em; font-size: 0.85rem; opacity: 0.65; text-align: center; }
.pxs-image-fallback { margin: 0; }
.pxs-image-skeleton {
  width: 100%; aspect-ratio: 16/9; border-radius: var(--pxs-radius);
  background: linear-gradient(135deg, color-mix(in srgb, var(--pxs-primary, #d946ef) 25%, transparent), color-mix(in srgb, var(--pxs-secondary, #06b6d4) 25%, transparent));
  position: relative; overflow: hidden;
}
.pxs-image-skeleton::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
  animation: pxs-shimmer 2.4s linear infinite;
}
@keyframes pxs-shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

/* Iframe & embed */
.pxs-iframe { width: 100%; aspect-ratio: 16/9; border: 0; border-radius: var(--pxs-radius); }
.pxs-embed iframe, .pxs-embed video { width: 100%; border-radius: var(--pxs-radius); border: 0; }

/* CTA */
.pxs-cta { text-align: center; padding: var(--pxs-spacing-md) 0; }
.pxs-cta-rich { padding: var(--pxs-spacing-lg) var(--pxs-spacing-md); }
.pxs-cta-title { font-family: var(--pxs-font-heading); font-size: clamp(1.5rem, 3.5vw, 2.5rem); font-weight: 800; margin: 0 0 0.4em; letter-spacing: -0.02em; }
.pxs-cta-subtitle { font-size: 1rem; opacity: 0.7; max-width: 42rem; margin: 0 auto 1.6em; line-height: 1.6; }

/* Buttons */
.pxs-button-primary {
  display: inline-block;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white; font-weight: 700;
  padding: 0.75em 1.75em; border-radius: 999px; text-decoration: none;
  font-size: 0.95rem; transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  box-shadow: 0 8px 24px -8px var(--pxs-primary);
  border: none; cursor: pointer; font-family: inherit;
}
.pxs-button-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 14px 36px -8px var(--pxs-primary); filter: brightness(1.06); }
.pxs-button-primary:focus-visible { outline: 2px solid var(--pxs-primary); outline-offset: 4px; }
.pxs-button-large { font-size: 1.0625rem; padding: 0.95em 2.2em; }
.pxs-button-block { display: inline-flex; justify-content: center; width: 100%; box-sizing: border-box; }
.pxs-button-light {
  display: inline-block; background: white; color: #18181b;
  font-weight: 700; padding: 0.75em 1.5em; border-radius: 999px; text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}
.pxs-button-light:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -10px rgba(0,0,0,0.4); }
.pxs-button-ghost {
  display: inline-block;
  background: transparent; color: white;
  border: 2px solid rgba(255,255,255,0.5);
  font-weight: 700; padding: 0.65em 1.4em; border-radius: 999px; text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}
.pxs-button-ghost:hover { background: rgba(255,255,255,0.12); border-color: white; }
.pxs-button-outline {
  display: inline-block;
  background: transparent; color: var(--pxs-foreground);
  border: 1.5px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 30%, transparent);
  font-weight: 700; padding: 0.75em 1.75em; border-radius: 999px; text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
  font-family: inherit; cursor: pointer; font-size: 0.95rem;
}
.pxs-button-outline:hover { border-color: var(--pxs-primary); background: color-mix(in srgb, var(--pxs-primary, #d946ef) 6%, transparent); }

/* Hero */
.pxs-hero {
  position: relative; border-radius: var(--pxs-radius); overflow: hidden;
  padding: var(--pxs-spacing-xl) var(--pxs-spacing-md); text-align: center;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
}
.pxs-hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); }
.pxs-hero-content { position: relative; z-index: 1; }
.pxs-h1 { font-family: var(--pxs-font-heading); font-size: clamp(2rem, 6vw, 4rem); font-weight: 900; color: white; margin: 0 0 0.5em; letter-spacing: -0.025em; line-height: 1.05; }
.pxs-hero-subtitle { color: rgba(255,255,255,0.92); font-size: clamp(1rem, 1.6vw, 1.125rem); max-width: 42rem; margin: 0 auto 1.5em; }

/* Columns */
.pxs-columns { display: grid; gap: var(--pxs-spacing-md); }
.pxs-columns-1 { grid-template-columns: 1fr; }
.pxs-columns-2 { grid-template-columns: 1fr; }
.pxs-columns-3 { grid-template-columns: 1fr; }
.pxs-columns-4 { grid-template-columns: 1fr; }
@media (min-width: 640px) {
  .pxs-columns-2 { grid-template-columns: repeat(2, 1fr); }
  .pxs-columns-3 { grid-template-columns: repeat(2, 1fr); }
  .pxs-columns-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 960px) {
  .pxs-columns-3 { grid-template-columns: repeat(3, 1fr); }
  .pxs-columns-4 { grid-template-columns: repeat(4, 1fr); }
}
.pxs-col-card {
  padding: var(--pxs-spacing-md);
  border-radius: var(--pxs-radius);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 8%, transparent);
  transition: transform .25s, border-color .25s, background .25s, box-shadow .25s;
}
.pxs-col-card:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--pxs-primary, #d946ef) 50%, transparent);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 6%, transparent);
  box-shadow: 0 18px 40px -20px color-mix(in srgb, var(--pxs-primary, #d946ef) 50%, transparent);
}
.pxs-col-icon {
  font-size: 2rem; width: 52px; height: 52px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--pxs-primary, #d946ef) 80%, transparent), color-mix(in srgb, var(--pxs-secondary, #06b6d4) 80%, transparent));
  margin-bottom: 12px;
}

/* ───────── GALLERY ───────── */
.pxs-gallery .pxs-filter-bar {
  display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;
  margin: 0 0 2.5rem;
}
.pxs-filter-btn {
  background: transparent; border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 18%, transparent);
  color: var(--pxs-foreground); padding: 0.45em 1.1em; border-radius: 999px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; font-family: inherit;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
}
.pxs-filter-btn:hover { border-color: var(--pxs-primary); }
.pxs-filter-btn.is-active {
  background: var(--pxs-primary); color: white; border-color: var(--pxs-primary);
}
.pxs-gallery-grid {
  display: grid; gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 720px) { .pxs-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
@media (min-width: 1080px) { .pxs-gallery-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; } }
.pxs-gallery-item {
  margin: 0; position: relative; overflow: hidden; aspect-ratio: 1/1;
  border-radius: calc(var(--pxs-radius) * 0.85);
  background: color-mix(in srgb, var(--pxs-foreground) 8%, transparent);
  cursor: zoom-in;
}
.pxs-gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
.pxs-gallery-item:hover img { transform: scale(1.08); }
.pxs-gallery-caption {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 14px 16px;
  background: linear-gradient(0deg, rgba(0,0,0,0.7), transparent);
  color: white; font-size: 0.85rem; transform: translateY(110%); transition: transform 0.4s;
}
.pxs-gallery-item:hover .pxs-gallery-caption { transform: translateY(0); }

/* ───────── PRICING ───────── */
.pxs-pricing-toggle {
  display: inline-flex; padding: 4px; gap: 4px;
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 6%, transparent);
  border-radius: 999px; margin: 0 auto 3rem;
  position: relative; left: 50%; transform: translateX(-50%);
}
.pxs-pricing-toggle-btn {
  background: transparent; border: none; color: var(--pxs-foreground);
  font-family: inherit; padding: 0.55em 1.4em; border-radius: 999px;
  font-size: 0.875rem; font-weight: 600; cursor: pointer; opacity: 0.7;
  transition: background 0.2s, opacity 0.2s, color 0.2s;
}
.pxs-pricing-toggle-btn.is-active {
  background: var(--pxs-primary); color: white; opacity: 1;
}
.pxs-badge {
  background: color-mix(in srgb, var(--pxs-secondary, #06b6d4) 80%, transparent);
  color: white; font-size: 0.7rem; padding: 0.15em 0.5em; border-radius: 4px; margin-left: 6px;
}
.pxs-pricing-grid {
  display: grid; gap: 20px; align-items: stretch;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) { .pxs-pricing-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 980px) { .pxs-pricing-grid { grid-template-columns: repeat(3, 1fr); } }
.pxs-pricing-card {
  padding: 2rem 1.75rem; border-radius: calc(var(--pxs-radius) * 1.1);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  display: flex; flex-direction: column; position: relative;
  transition: transform 0.3s, box-shadow 0.3s, border-color 0.3s;
}
.pxs-pricing-card:hover { transform: translateY(-4px); box-shadow: 0 24px 60px -20px color-mix(in srgb, var(--pxs-primary, #d946ef) 40%, transparent); }
.pxs-pricing-card.is-highlight {
  border: 2px solid var(--pxs-primary);
  background: color-mix(in srgb, var(--pxs-primary, #d946ef) 6%, transparent);
  transform: scale(1.02);
}
.pxs-pricing-tag {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white; font-size: 0.75rem; font-weight: 700;
  padding: 0.3em 1em; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.08em;
}
.pxs-pricing-name { font-family: var(--pxs-font-heading); font-size: 1.25rem; font-weight: 700; margin: 0 0 1rem; }
.pxs-pricing-price { display: baseline; }
.pxs-pricing-amount { font-family: var(--pxs-font-heading); font-size: clamp(2.25rem, 4.5vw, 3rem); font-weight: 800; letter-spacing: -0.03em; }
.pxs-pricing-period { font-size: 0.95rem; opacity: 0.6; margin-left: 6px; }
.pxs-pricing-desc { font-size: 0.9rem; opacity: 0.7; margin: 1rem 0; }
.pxs-pricing-features { list-style: none; padding: 0; margin: 1.25rem 0 1.75rem; flex: 1; }
.pxs-pricing-features li { padding: 0.5em 0; font-size: 0.9375rem; display: flex; align-items: start; gap: 10px; line-height: 1.5; border-top: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 6%, transparent); }
.pxs-pricing-features li:first-child { border-top: none; }
.pxs-check {
  color: var(--pxs-primary); font-weight: 800; flex: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: color-mix(in srgb, var(--pxs-primary, #d946ef) 18%, transparent);
  display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem;
}

/* ───────── TESTIMONIALS ───────── */
.pxs-testimonials-carousel { position: relative; }
.pxs-testimonials-track {
  display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory;
  scroll-behavior: smooth; padding: 8px 4px 24px;
  scrollbar-width: thin; scrollbar-color: var(--pxs-primary) transparent;
}
.pxs-testimonials-track::-webkit-scrollbar { height: 6px; }
.pxs-testimonials-track::-webkit-scrollbar-thumb { background: var(--pxs-primary); border-radius: 3px; }
.pxs-testimonial-card {
  flex: 0 0 min(86%, 420px); scroll-snap-align: start;
  padding: 2rem; border-radius: calc(var(--pxs-radius) * 1.1);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  position: relative;
}
.pxs-quote-mark {
  font-family: Georgia, serif; font-size: 4rem; line-height: 0.6;
  color: var(--pxs-primary); opacity: 0.4; margin-bottom: 8px;
}
.pxs-stars { display: flex; gap: 2px; margin-bottom: 12px; }
.pxs-star { color: color-mix(in srgb, var(--pxs-foreground, #fafafa) 20%, transparent); font-size: 1rem; }
.pxs-star.is-on { color: var(--pxs-accent, #f59e0b); }
.pxs-testimonial-quote { font-size: 1.0625rem; line-height: 1.6; margin: 0 0 1.5rem; }
.pxs-testimonial-author { display: flex; align-items: center; gap: 12px; }
.pxs-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
.pxs-avatar-placeholder {
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white; display: inline-flex; align-items: center; justify-content: center; font-weight: 700;
}
.pxs-testimonial-name { font-weight: 700; font-size: 0.9375rem; }
.pxs-testimonial-role { font-size: 0.8125rem; opacity: 0.6; }
.pxs-carousel-nav { display: flex; gap: 10px; justify-content: center; margin-top: 16px; }
.pxs-carousel-btn {
  width: 44px; height: 44px; border-radius: 50%; cursor: pointer;
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 12%, transparent);
  color: var(--pxs-foreground); font-size: 1.1rem;
  transition: background 0.2s, border-color 0.2s;
}
.pxs-carousel-btn:hover { background: var(--pxs-primary); border-color: var(--pxs-primary); color: white; }

/* ───────── FAQ ───────── */
.pxs-faq-list { display: flex; flex-direction: column; gap: 12px; }
.pxs-faq-item {
  border-radius: calc(var(--pxs-radius) * 0.85);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  overflow: hidden; transition: border-color 0.25s;
}
.pxs-faq-item[open] { border-color: var(--pxs-primary); }
.pxs-faq-q {
  cursor: pointer; padding: 1.2rem 1.5rem; list-style: none;
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  font-weight: 600; font-size: 1rem;
}
.pxs-faq-q::-webkit-details-marker { display: none; }
.pxs-faq-icon {
  flex: none; width: 28px; height: 28px; border-radius: 50%;
  background: color-mix(in srgb, var(--pxs-primary, #d946ef) 16%, transparent);
  color: var(--pxs-primary); display: inline-flex; align-items: center; justify-content: center;
  font-size: 1.2rem; transition: transform 0.3s, background 0.2s;
}
.pxs-faq-item[open] .pxs-faq-icon { transform: rotate(45deg); background: var(--pxs-primary); color: white; }
.pxs-faq-a { padding: 0 1.5rem 1.4rem; font-size: 0.9375rem; line-height: 1.65; opacity: 0.85; }

/* ───────── COUNTERS ───────── */
.pxs-counters-grid {
  display: grid; gap: 24px; text-align: center;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 768px) { .pxs-counters-grid { grid-template-columns: repeat(4, 1fr); } }
.pxs-counter-item {
  padding: 1.5rem 1rem; border-radius: var(--pxs-radius);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
}
.pxs-counter-value {
  font-family: var(--pxs-font-heading);
  font-size: clamp(2.25rem, 5vw, 3.25rem); font-weight: 800; letter-spacing: -0.03em;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  line-height: 1;
}
.pxs-counter-label { margin-top: 8px; font-size: 0.875rem; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }

/* ───────── TEAM ───────── */
.pxs-team-grid { display: grid; gap: 28px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .pxs-team-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 960px) { .pxs-team-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1200px) { .pxs-team-grid { grid-template-columns: repeat(4, 1fr); } }
.pxs-team-card { text-align: center; }
.pxs-team-photo {
  width: 100%; aspect-ratio: 1/1; border-radius: calc(var(--pxs-radius) * 1.2);
  overflow: hidden; margin-bottom: 1rem; position: relative;
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 8%, transparent);
}
.pxs-team-photo img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s; }
.pxs-team-card:hover .pxs-team-photo img { transform: scale(1.05); }
.pxs-team-name { font-family: var(--pxs-font-heading); font-size: 1.15rem; font-weight: 700; margin: 0 0 4px; }
.pxs-team-role { font-size: 0.8125rem; color: var(--pxs-primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.6rem; }
.pxs-team-bio { font-size: 0.875rem; opacity: 0.75; line-height: 1.55; margin: 0 0 1rem; }
.pxs-team-socials { display: flex; gap: 8px; justify-content: center; }
.pxs-team-socials a {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 6%, transparent);
  color: var(--pxs-foreground); text-decoration: none; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  transition: background 0.2s;
}
.pxs-team-socials a:hover { background: var(--pxs-primary); color: white; }

/* ───────── SERVICES (bento) ───────── */
.pxs-services-bento {
  display: grid; gap: 16px;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .pxs-services-bento {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: minmax(220px, auto);
  }
  .pxs-service-card { grid-column: span 2; }
  .pxs-service-card.is-big { grid-column: span 3; grid-row: span 2; }
}
.pxs-service-card {
  position: relative; padding: 1.75rem;
  border-radius: calc(var(--pxs-radius) * 1.1);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  color: var(--pxs-foreground); text-decoration: none;
  display: flex; flex-direction: column; justify-content: space-between;
  transition: transform 0.25s, border-color 0.25s, background 0.25s;
  min-height: 200px; overflow: hidden;
}
.pxs-service-card::before {
  content: ''; position: absolute; top: -50%; right: -30%; width: 60%; height: 100%;
  background: radial-gradient(circle, color-mix(in srgb, var(--pxs-primary, #d946ef) 30%, transparent), transparent 60%);
  opacity: 0; transition: opacity 0.4s;
  pointer-events: none;
}
.pxs-service-card:hover {
  transform: translateY(-4px);
  border-color: color-mix(in srgb, var(--pxs-primary, #d946ef) 60%, transparent);
}
.pxs-service-card:hover::before { opacity: 1; }
.pxs-service-card.is-big { background: linear-gradient(135deg, color-mix(in srgb, var(--pxs-primary, #d946ef) 12%, transparent), color-mix(in srgb, var(--pxs-secondary, #06b6d4) 8%, transparent)); }
.pxs-service-icon { font-size: 2rem; margin-bottom: 0.75rem; }
.pxs-service-title { font-family: var(--pxs-font-heading); font-size: clamp(1.15rem, 2vw, 1.4rem); font-weight: 700; margin: 0 0 0.5rem; }
.pxs-service-card.is-big .pxs-service-title { font-size: clamp(1.5rem, 2.5vw, 1.875rem); }
.pxs-service-desc { font-size: 0.9375rem; opacity: 0.75; line-height: 1.55; margin: 0; flex: 1; }
.pxs-service-arrow {
  margin-top: 1rem; font-size: 1.4rem; color: var(--pxs-primary);
  transition: transform 0.3s;
}
.pxs-service-card:hover .pxs-service-arrow { transform: translateX(4px); }

/* ───────── TIMELINE ───────── */
.pxs-timeline-list { list-style: none; padding: 0; margin: 0; position: relative; }
.pxs-timeline-list::before {
  content: ''; position: absolute; left: 24px; top: 8px; bottom: 8px; width: 2px;
  background: linear-gradient(180deg, var(--pxs-primary), var(--pxs-secondary));
  opacity: 0.5;
}
.pxs-timeline-item { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 2rem; position: relative; padding-left: 4px; }
.pxs-timeline-dot {
  flex: none; width: 48px; height: 48px; border-radius: 50%;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white; font-weight: 700; display: inline-flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px -6px var(--pxs-primary);
  z-index: 1; font-size: 1.1rem;
}
.pxs-timeline-content { padding-top: 6px; }
.pxs-timeline-date { font-size: 0.8125rem; color: var(--pxs-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
.pxs-timeline-title { font-family: var(--pxs-font-heading); font-size: 1.15rem; font-weight: 700; margin: 0 0 6px; }
.pxs-timeline-desc { font-size: 0.9375rem; opacity: 0.8; line-height: 1.6; margin: 0; }

/* ───────── MARQUEE ───────── */
.pxs-marquee {
  overflow: hidden; padding: 1.5rem 0;
  border-block: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 2%, transparent);
  --pxs-marquee-speed: 28s;
}
.pxs-marquee-track {
  display: flex; gap: 3rem; width: max-content;
  animation: pxs-marquee var(--pxs-marquee-speed) linear infinite;
}
.pxs-marquee-item { display: inline-flex; align-items: center; gap: 3rem; font-family: var(--pxs-font-heading); font-size: clamp(1.25rem, 2.4vw, 1.75rem); font-weight: 600; }
.pxs-marquee-logos .pxs-marquee-item img { max-height: 44px; max-width: 140px; object-fit: contain; opacity: 0.6; filter: grayscale(1); transition: filter 0.3s, opacity 0.3s; }
.pxs-marquee-logos .pxs-marquee-item:hover img { filter: grayscale(0); opacity: 1; }
.pxs-marquee-sep { color: var(--pxs-primary); opacity: 0.6; font-size: 0.9em; }
.pxs-marquee-logos .pxs-marquee-sep { display: none; }
.pxs-marquee:hover .pxs-marquee-track { animation-play-state: paused; }
@keyframes pxs-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

/* ───────── CTA BANNER ───────── */
.pxs-cta-banner {
  position: relative; overflow: hidden; padding: clamp(4rem, 8vw, 7rem) 0; text-align: center;
  background: linear-gradient(135deg, var(--pxs-primary), var(--pxs-secondary));
  color: white;
}
.pxs-cta-mesh {
  position: absolute; inset: -20%;
  background:
    radial-gradient(circle at 20% 30%, color-mix(in srgb, var(--pxs-accent, #f59e0b) 60%, transparent), transparent 50%),
    radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--pxs-primary, #d946ef) 70%, transparent), transparent 55%);
  filter: blur(60px);
  animation: pxs-mesh-float 18s ease-in-out infinite alternate;
  opacity: 0.5;
  pointer-events: none;
}
@keyframes pxs-mesh-float {
  0% { transform: translate(0,0) rotate(0); }
  100% { transform: translate(30px, -20px) rotate(8deg); }
}
.pxs-cta-banner-title {
  position: relative; font-family: var(--pxs-font-heading);
  font-size: clamp(2rem, 6vw, 4rem); font-weight: 800; letter-spacing: -0.025em; line-height: 1.05;
  margin: 0 0 0.5em;
}
.pxs-cta-banner-subtitle { position: relative; font-size: clamp(1rem, 2vw, 1.2rem); opacity: 0.92; max-width: 38rem; margin: 0 auto 2rem; line-height: 1.55; }
.pxs-cta-banner-actions { position: relative; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

/* ───────── LOGO CLOUD ───────── */
.pxs-logo-cloud-title { text-align: center; font-size: 0.875rem; font-weight: 600; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 2.5rem; }
.pxs-logo-cloud-grid {
  display: grid; gap: 28px; align-items: center;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 640px) { .pxs-logo-cloud-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 900px) { .pxs-logo-cloud-grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1200px) { .pxs-logo-cloud-grid { grid-template-columns: repeat(6, 1fr); } }
.pxs-logo-cloud-item {
  display: flex; align-items: center; justify-content: center;
  height: 60px; padding: 0 8px;
  opacity: 0.55; filter: grayscale(1); transition: opacity 0.3s, filter 0.3s;
}
.pxs-logo-cloud-item:hover { opacity: 1; filter: grayscale(0); }
.pxs-logo-cloud-item img { max-height: 44px; max-width: 100%; object-fit: contain; }
.pxs-logo-placeholder {
  font-family: var(--pxs-font-heading); font-weight: 700; font-size: 1rem;
  opacity: 0.7; letter-spacing: 0.05em;
}

/* ───────── FEATURE GRID (bento asym) ───────── */
.pxs-feature-grid {
  display: grid; gap: 20px;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .pxs-feature-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .pxs-feature-card.is-wide { grid-column: span 2; }
}
.pxs-feature-card {
  padding: 1.75rem; border-radius: calc(var(--pxs-radius) * 1.1);
  background: color-mix(in srgb, var(--pxs-foreground, #fafafa) 4%, transparent);
  border: 1px solid color-mix(in srgb, var(--pxs-foreground, #fafafa) 10%, transparent);
  position: relative; overflow: hidden;
  transition: transform 0.25s, border-color 0.25s;
}
.pxs-feature-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--pxs-primary, #d946ef) 50%, transparent); }
.pxs-feature-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--pxs-primary, #d946ef) 80%, transparent), color-mix(in srgb, var(--pxs-secondary, #06b6d4) 80%, transparent));
  font-size: 1.6rem; color: white; margin-bottom: 1rem;
}
.pxs-feature-title { font-family: var(--pxs-font-heading); font-size: 1.2rem; font-weight: 700; margin: 0 0 0.5rem; }
.pxs-feature-desc { font-size: 0.9375rem; opacity: 0.78; line-height: 1.6; margin: 0; }
`;
