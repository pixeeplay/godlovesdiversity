'use client';
import { useEffect, useState } from 'react';

type Theme = {
  slug: string;
  name: string;
  colors: any;
  fonts: any;
  decorations: any;
  customCss: string | null;
  musicUrl?: string | null;
  musicVolume?: number | null;
  mood?: string | null;
};

/**
 * Applique le thème actif globalement :
 * - Injecte les variables CSS dans :root
 * - Ajoute le custom CSS dans une balise <style>
 * - Active les animations décoratives (snow, hearts, confetti...)
 *
 * Monté dans le layout root, fetch /api/themes/active au boot.
 */
export function ThemeApplier() {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [musicAllowed, setMusicAllowed] = useState(false);

  useEffect(() => {
    fetch('/api/themes/active', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (j.theme) setTheme(j.theme); })
      .catch(() => {});

    // L'utilisateur a-t-il activé la musique de thème ?
    setMusicAllowed(localStorage.getItem('gld_theme_music') === '1');
  }, []);

  // Audio player thème
  useEffect(() => {
    if (!theme?.musicUrl || !musicAllowed) return;
    const audio = new Audio(theme.musicUrl);
    audio.loop = true;
    audio.volume = theme.musicVolume ?? 0.3;
    audio.play().catch(() => {});
    return () => { audio.pause(); audio.src = ''; };
  }, [theme?.musicUrl, theme?.musicVolume, musicAllowed]);

  useEffect(() => {
    if (!theme) return;
    const root = document.documentElement;

    // Variables CSS
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([k, v]) => {
        root.style.setProperty(`--theme-${k}`, String(v));
      });
      // Override des variables principales du site si elles existent
      if (theme.colors.bg)        root.style.setProperty('--bg', theme.colors.bg);
      if (theme.colors.fg)        root.style.setProperty('--fg', theme.colors.fg);
      if (theme.colors.accent)    root.style.setProperty('--accent', theme.colors.accent);
      if (theme.colors.primary)   root.style.setProperty('--brand-pink', theme.colors.primary);
      if (theme.colors.secondary) root.style.setProperty('--brand-violet', theme.colors.secondary);
      if (theme.colors.border)    root.style.setProperty('--border', theme.colors.border);
      if (theme.colors.surface)   root.style.setProperty('--surface', theme.colors.surface);
    }

    // Fonts
    if (theme.fonts?.display) root.style.setProperty('--font-display', theme.fonts.display);
    if (theme.fonts?.body)    root.style.setProperty('--font-body', theme.fonts.body);

    // Custom CSS
    let styleEl = document.getElementById('gld-theme-custom-css') as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'gld-theme-custom-css';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = theme.customCss || '';

    // Marker class pour le thème actif
    document.body.dataset.theme = theme.slug;
  }, [theme]);

  if (!theme) return null;
  const d = theme.decorations || {};

  function toggleMusic() {
    const next = !musicAllowed;
    setMusicAllowed(next);
    localStorage.setItem('gld_theme_music', next ? '1' : '0');
  }

  return (
    <>
      {/* Bouton flottant musique de thème (apparaît seulement si le thème actif a une musique) */}
      {theme.musicUrl && (
        <button
          onClick={toggleMusic}
          className={`fixed bottom-24 left-4 z-[60] rounded-full p-2.5 shadow-xl backdrop-blur transition ${musicAllowed ? 'bg-fuchsia-500 hover:bg-fuchsia-600 text-white' : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'}`}
          title={musicAllowed ? `Couper la musique du thème ${theme.name}` : `Activer la musique d'ambiance ${theme.name}`}
        >
          {musicAllowed ? '🔊' : '🔇'}
        </button>
      )}

      {d.snow       && <ParticleLayer kind="snow"     emoji="❄️" count={30} speed={[10, 25]} />}
      {d.hearts     && <ParticleLayer kind="hearts"   emoji="💗" count={15} speed={[8, 18]}  />}
      {d.confetti   && <ParticleLayer kind="confetti" emoji="🎉" count={25} speed={[6, 14]}  />}
      {d.petals     && <ParticleLayer kind="petals"   emoji="🌸" count={20} speed={[15, 30]} />}
      {d.fireworks  && <FireworksLayer />}
      {d.bubbles    && <ParticleLayer kind="bubbles"  emoji="🫧" count={20} speed={[12, 25]} reverse />}
      {d.leaves     && <ParticleLayer kind="leaves"   emoji="🍃" count={15} speed={[14, 28]} />}
      {d.stars      && <ParticleLayer kind="stars"    emoji="✨" count={12} speed={[18, 35]} static />}
      {d.pumpkins   && <ParticleLayer kind="pumpkins" emoji="🎃" count={8}  speed={[20, 35]} />}
      {d.eggs       && <ParticleLayer kind="eggs"     emoji="🥚" count={12} speed={[15, 28]} />}
      {d.lanterns   && <ParticleLayer kind="lanterns" emoji="🪔" count={10} speed={[20, 35]} reverse />}
      {d.diamonds   && <ParticleLayer kind="diamonds" emoji="💎" count={10} speed={[18, 30]} />}
      {d.rainbow    && <RainbowBar />}
    </>
  );
}

/* ============= LAYERS ============= */

function ParticleLayer({ kind, emoji, count, speed, reverse, static: isStatic }: {
  kind: string; emoji: string; count: number; speed: [number, number]; reverse?: boolean; static?: boolean;
}) {
  const items = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 10}s`,
    duration: `${speed[0] + Math.random() * (speed[1] - speed[0])}s`,
    size: `${0.8 + Math.random() * 1.2}rem`,
    drift: `${(Math.random() - 0.5) * 200}px`
  }));
  return (
    <div className="gld-particles" data-kind={kind}>
      {items.map(p => (
        <span
          key={p.id}
          className={`gld-particle ${reverse ? 'gld-particle-up' : 'gld-particle-down'} ${isStatic ? 'gld-particle-twinkle' : ''}`}
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            fontSize: p.size,
            // @ts-ignore
            '--drift': p.drift
          } as any}
        >{emoji}</span>
      ))}
    </div>
  );
}

function RainbowBar() {
  return (
    <div className="gld-rainbow-bar" />
  );
}

function FireworksLayer() {
  return (
    <div className="gld-fireworks">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="gld-firework" style={{
          left: `${20 + i * 15}%`,
          animationDelay: `${i * 0.8}s`
        }} />
      ))}
    </div>
  );
}
