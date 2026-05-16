'use client';
import { useEffect, useState } from 'react';

/**
 * Bannière de consentement cookies conforme RGPD/ePrivacy.
 * Mémorise le choix dans un cookie `pxs-consent` (valeurs: all|necessary|denied)
 * et déclenche window.dispatchEvent('pxs:consent-change', { detail: { choice } }).
 * A11y : focus visible, ESC ferme (= refus implicite côté EU = denied jusqu'à choix actif),
 *        aria-live polite pour annoncer l'apparition.
 */
const COOKIE_KEY = 'pxs-consent';
const COOKIE_DAYS = 180;

type Choice = 'all' | 'necessary' | 'denied' | null;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1] || '') : null;
}

function writeCookie(name: string, value: string, days = COOKIE_DAYS) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const existing = readCookie(COOKIE_KEY) as Choice;
    if (!existing) setOpen(true);
  }, []);

  function save(choice: 'all' | 'necessary' | 'denied') {
    writeCookie(COOKIE_KEY, choice);
    setOpen(false);
    try {
      window.dispatchEvent(new CustomEvent('pxs:consent-change', { detail: { choice } }));
    } catch { /* noop */ }
  }

  if (!open) return null;

  return (
    <div
      role="region"
      aria-label="Bannière de consentement cookies"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 880,
        margin: '0 auto',
        background: 'rgba(10,10,15,0.96)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(217,70,239,0.4)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        padding: 20,
        color: '#fafafa',
        zIndex: 9998,
        fontSize: 14,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>🍪</div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <strong style={{ display: 'block', marginBottom: 6, fontSize: 15 }}>Cookies & vie privée</strong>
          <p style={{ margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
            Ce site utilise des cookies pour le fonctionnement essentiel et, avec votre accord, des
            mesures d'audience et de personnalisation. Vous pouvez accepter, refuser, ou choisir.
          </p>
          {showDetails && (
            <ul style={{ margin: '12px 0 0', paddingLeft: 18, opacity: 0.75, lineHeight: 1.6 }}>
              <li><strong>Nécessaires</strong> — session, sécurité, préférences. Toujours actifs.</li>
              <li><strong>Mesure d'audience</strong> — comprendre comment le site est utilisé.</li>
              <li><strong>Personnalisation</strong> — contenu adapté à votre profil.</li>
            </ul>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setShowDetails((d) => !d)}
          aria-expanded={showDetails}
          style={{
            background: 'transparent', color: '#a1a1aa', border: '1px solid #3f3f46',
            padding: '8px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}
        >
          {showDetails ? 'Masquer' : 'En savoir plus'}
        </button>
        <button
          type="button"
          onClick={() => save('denied')}
          style={{
            background: 'transparent', color: '#fafafa', border: '1px solid #3f3f46',
            padding: '8px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}
        >
          Refuser
        </button>
        <button
          type="button"
          onClick={() => save('necessary')}
          style={{
            background: '#27272a', color: '#fafafa', border: '1px solid #3f3f46',
            padding: '8px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}
        >
          Nécessaires
        </button>
        <button
          type="button"
          onClick={() => save('all')}
          autoFocus
          style={{
            background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', border: 0,
            padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13,
            boxShadow: '0 4px 14px rgba(217,70,239,0.35)',
          }}
        >
          Tout accepter
        </button>
      </div>
    </div>
  );
}
