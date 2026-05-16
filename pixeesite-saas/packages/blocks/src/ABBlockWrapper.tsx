'use client';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Wrapper d'A/B test client-side : choisit un variant aléatoirement (pondéré)
 * et mémorise la décision en localStorage (pxs-exp-<id>) pour stickiness.
 *
 * Le render initial est neutre (placeholder vide) pour éviter mismatch SSR.
 * Au mount, on choisit/restore le variant et on appelle `render(variantIndex)`.
 *
 * Émet l'event window `pxs:experiment-shown` { experimentId, variantIndex, label }
 * pour intégration analytics/tracking custom.
 */
interface ABProps {
  experimentId: string;
  variants: Array<{ weight?: number; label?: string }>;
  render: (variantIndex: number) => ReactNode;
  /** Affiché tant que la décision n'est pas prise (SSR pass-through). */
  fallback?: ReactNode;
}

export function ABBlockWrapper({ experimentId, variants, render, fallback = null }: ABProps) {
  const [variant, setVariant] = useState<number | null>(null);

  const totalWeight = useMemo(() => {
    return variants.reduce((s, v) => s + (typeof v.weight === 'number' && v.weight > 0 ? v.weight : 1), 0);
  }, [variants]);

  useEffect(() => {
    if (!variants?.length) return;
    const key = `pxs-exp-${experimentId}`;
    let chosen: number | null = null;
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const n = parseInt(stored, 10);
        if (!isNaN(n) && n >= 0 && n < variants.length) chosen = n;
      }
    } catch { /* localStorage unavailable */ }

    if (chosen === null) {
      const r = Math.random() * totalWeight;
      let acc = 0;
      for (let i = 0; i < variants.length; i++) {
        acc += (typeof variants[i].weight === 'number' && variants[i].weight! > 0 ? variants[i].weight! : 1);
        if (r < acc) { chosen = i; break; }
      }
      if (chosen === null) chosen = 0;
      try { localStorage.setItem(key, String(chosen)); } catch { /* noop */ }
    }
    setVariant(chosen);
    try {
      window.dispatchEvent(new CustomEvent('pxs:experiment-shown', {
        detail: { experimentId, variantIndex: chosen, label: variants[chosen]?.label || `v${chosen}` },
      }));
    } catch { /* noop */ }
  }, [experimentId, totalWeight, variants]);

  if (variant === null) return <>{fallback}</>;
  return <>{render(variant)}</>;
}
