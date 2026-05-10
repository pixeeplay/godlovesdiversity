'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';
import { getEffect } from './effects-library';

/**
 * Wrap any element to apply one of the 100 GLD effects.
 *
 * Usage :
 *   <EffectWrapper effect="zoom-in" delay={200}>
 *     <h1>Hello</h1>
 *   </EffectWrapper>
 *
 * Pour les effets de catégorie `entry`, `scroll`, `transition`, l'animation est
 * déclenchée quand l'élément entre dans le viewport (IntersectionObserver).
 * Pour `hover`, `text`, `background`, `card`, l'effet est appliqué en permanence
 * via la classe (hover natif ou keyframes infinis).
 */
export function EffectWrapper({
  effect,
  delay = 0,
  className = '',
  as: Tag = 'div',
  children,
  threshold = 0.15,
  once = true
}: {
  effect?: string | null;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'span' | 'h1' | 'h2' | 'h3' | 'p';
  children: ReactNode;
  threshold?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(false);
  const fx = effect ? getEffect(effect) : undefined;
  const isObserved = !!fx && ['entry', 'scroll', 'transition', 'reveal'].includes(fx.category);

  useEffect(() => {
    if (!isObserved) {
      setActive(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            window.setTimeout(() => setActive(true), delay);
            if (once) obs.disconnect();
          } else if (!once) {
            setActive(false);
          }
        });
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isObserved, delay, threshold, once]);

  if (!fx) {
    return <Tag ref={ref as any} className={className}>{children}</Tag>;
  }

  const fxClass = `gld-fx-${fx.id}`;
  const dataAttr = isObserved ? { 'data-fx-entry': '1' } : {};
  return (
    <Tag
      ref={ref as any}
      {...(dataAttr as any)}
      className={`${fxClass} ${active ? 'gld-fx-active' : ''} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
