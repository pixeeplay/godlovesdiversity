'use client';
import { useEffect, useState } from 'react';

/**
 * SiriAIProgressBar — barre de progression style Apple Siri.
 * Affichée pendant les opérations IA longues (génération de plan, batch d'images, etc.).
 *
 * Composé de :
 *   - Une orbe radiale avec gradient animé (3 blobs qui flottent)
 *   - Une onde audio animée (5 barres qui pulsent)
 *   - Un message dynamique au centre
 *   - Une barre de progression linéaire en bas (si percent fourni)
 *
 * Variants :
 *   - inline   : intégré dans une page (compact)
 *   - modal    : overlay plein écran (loader bloquant)
 *   - banner   : bande horizontale (header)
 */

export type SiriProps = {
  active: boolean;
  message?: string;
  subMessage?: string;
  percent?: number;             // 0-100, undefined = barre indéterminée
  variant?: 'inline' | 'modal' | 'banner';
  /** Liste de messages cyclés automatiquement (ex: ["Analyse…", "Génération…", "Optimisation…"]) */
  cycleMessages?: string[];
  cycleIntervalMs?: number;
  /** Couleur principale du gradient — défaut violet/fuchsia/cyan */
  colors?: [string, string, string];
};

export function SiriAIProgressBar({
  active,
  message,
  subMessage,
  percent,
  variant = 'inline',
  cycleMessages,
  cycleIntervalMs = 2200,
  colors = ['#a855f7', '#ec4899', '#06b6d4']
}: SiriProps) {
  const [cycledMsg, setCycledMsg] = useState<string | undefined>(cycleMessages?.[0]);

  useEffect(() => {
    if (!active || !cycleMessages || cycleMessages.length < 2) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % cycleMessages.length;
      setCycledMsg(cycleMessages[i]);
    }, cycleIntervalMs);
    return () => clearInterval(id);
  }, [active, cycleMessages, cycleIntervalMs]);

  if (!active) return null;

  const displayMsg = cycledMsg || message;
  const [c1, c2, c3] = colors;

  const Inner = (
    <div className={variant === 'modal' ? 'flex flex-col items-center gap-6 p-8' : 'flex items-center gap-4'}>
      {/* Orbe Siri */}
      <div
        className={`relative ${variant === 'modal' ? 'w-40 h-40' : variant === 'banner' ? 'w-12 h-12' : 'w-20 h-20'} shrink-0`}
        aria-hidden="true"
      >
        {/* Halo extérieur */}
        <div
          className="absolute inset-0 rounded-full opacity-30 blur-xl"
          style={{
            background: `radial-gradient(circle, ${c1}, transparent 70%)`,
            animation: 'siriHaloPulse 2.5s ease-in-out infinite'
          }}
        />
        {/* Blob 1 (rotation lente, gradient violet) */}
        <div
          className="absolute inset-2 rounded-full mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${c1}cc, ${c1}00 65%)`,
            animation: 'siriBlob1 4s ease-in-out infinite'
          }}
        />
        {/* Blob 2 (rotation inverse, gradient fuchsia) */}
        <div
          className="absolute inset-2 rounded-full mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 70% 60%, ${c2}cc, ${c2}00 65%)`,
            animation: 'siriBlob2 5s ease-in-out infinite'
          }}
        />
        {/* Blob 3 (gradient cyan) */}
        <div
          className="absolute inset-2 rounded-full mix-blend-screen"
          style={{
            background: `radial-gradient(circle at 50% 80%, ${c3}cc, ${c3}00 65%)`,
            animation: 'siriBlob3 6s ease-in-out infinite'
          }}
        />
        {/* Anneau lumineux */}
        <div
          className="absolute inset-0 rounded-full border-2 opacity-60"
          style={{
            borderColor: c2,
            boxShadow: `0 0 20px ${c2}, inset 0 0 20px ${c2}`,
            animation: 'siriRingPulse 1.8s ease-in-out infinite'
          }}
        />
        {/* Ondes audio centrales (5 barres) */}
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: variant === 'banner' ? 1 : 2,
                background: i % 2 === 0 ? c1 : c2,
                animation: `siriBar 0.9s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
                height: variant === 'modal' ? 50 : variant === 'banner' ? 14 : 28
              }}
            />
          ))}
        </div>
      </div>

      {/* Texte */}
      {(displayMsg || subMessage) && (
        <div className={variant === 'modal' ? 'text-center' : 'flex-1 min-w-0'}>
          {displayMsg && (
            <p
              className={`font-bold ${variant === 'modal' ? 'text-2xl' : variant === 'banner' ? 'text-sm' : 'text-base'} text-white`}
              style={{
                background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'siriGradientShift 3s linear infinite',
                backgroundSize: '200% auto'
              }}
            >
              {displayMsg}
            </p>
          )}
          {subMessage && (
            <p className={`text-zinc-400 ${variant === 'modal' ? 'text-sm mt-2' : 'text-xs mt-0.5'}`}>{subMessage}</p>
          )}
          {/* Progress bar linéaire */}
          {(typeof percent === 'number' || variant === 'banner') && (
            <div className={`mt-2 h-1 rounded-full bg-zinc-800/60 overflow-hidden ${variant === 'modal' ? 'w-64 mx-auto' : 'w-full max-w-md'}`}>
              {typeof percent === 'number' ? (
                <div
                  className="h-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, percent))}%`,
                    background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})`,
                    backgroundSize: '200% 100%',
                    animation: 'siriGradientShift 2s linear infinite'
                  }}
                />
              ) : (
                <div
                  className="h-full w-1/3"
                  style={{
                    background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})`,
                    animation: 'siriIndeterminate 1.6s ease-in-out infinite'
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes siriBlob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(15%,-10%) scale(1.1); }
          66% { transform: translate(-10%,15%) scale(0.95); }
        }
        @keyframes siriBlob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-15%,15%) scale(1.05); }
          66% { transform: translate(15%,-5%) scale(0.92); }
        }
        @keyframes siriBlob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-5%,-10%) scale(1.15); }
        }
        @keyframes siriRingPulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes siriHaloPulse {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 0.6; }
        }
        @keyframes siriBar {
          0%,100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        @keyframes siriGradientShift {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes siriIndeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}} />
      {variant === 'modal' ? (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center" role="dialog" aria-busy="true">
          <div className="bg-zinc-900/80 ring-1 ring-violet-500/40 rounded-3xl shadow-2xl">
            {Inner}
          </div>
        </div>
      ) : variant === 'banner' ? (
        <div className="bg-zinc-900/60 ring-1 ring-violet-500/30 rounded-xl px-3 py-2">
          {Inner}
        </div>
      ) : (
        <div className="bg-zinc-900/60 ring-1 ring-violet-500/30 rounded-2xl p-4">
          {Inner}
        </div>
      )}
    </>
  );
}
