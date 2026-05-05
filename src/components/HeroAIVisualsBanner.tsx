'use client';
import { useEffect, useState } from 'react';

/**
 * Bannière qui affiche les visuels IA hero générés depuis /admin/ai (HeroVisualsAdmin).
 * Lit visuals.heroStyle (ai/svg/off) + visuals.heroAiUrls dans Settings public.
 *
 * À monter sur la home (page.tsx) ou sur /argumentaire pour donner un peu d'âme.
 */
export function HeroAIVisualsBanner({ height = 320 }: { height?: number }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [style, setStyle] = useState<'ai' | 'svg' | 'off'>('svg');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    fetch('/api/settings/public?keys=visuals.heroStyle,visuals.heroAiUrls', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (j['visuals.heroStyle']) setStyle(j['visuals.heroStyle']);
        if (j['visuals.heroAiUrls']) {
          try {
            const parsed = JSON.parse(j['visuals.heroAiUrls']);
            if (Array.isArray(parsed)) setUrls(parsed);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Auto-rotation toutes les 6s si plusieurs visuels
  useEffect(() => {
    if (urls.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % urls.length), 6000);
    return () => clearInterval(t);
  }, [urls.length]);

  // Si style != 'ai' ou pas d'URLs → on cache
  if (style !== 'ai' || urls.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl mb-8 group" style={{ height }}>
      {urls.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url + i}
          src={url}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {/* Overlay gradient pour lisibilité éventuel texte par-dessus */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-4 text-white/90 text-xs font-bold tracking-widest uppercase">
        ✨ Visuels générés par IA · GLD
      </div>
      {urls.length > 1 && (
        <div className="absolute bottom-4 right-4 flex gap-1.5">
          {urls.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-2 h-2 rounded-full transition ${i === idx ? 'bg-white w-6' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </section>
  );
}
