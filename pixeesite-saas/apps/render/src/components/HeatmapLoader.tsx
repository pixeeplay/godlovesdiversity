'use client';
import { useEffect, useState } from 'react';

/**
 * Charge Microsoft Clarity et/ou Hotjar UNIQUEMENT si :
 *   1. L'utilisateur a accepté les cookies "all" (cookie pxs-consent=all)
 *   2. L'org a configuré MICROSOFT_CLARITY_ID ou HOTJAR_ID via /api/public/site-config
 *
 * Cas EU strict : refus = aucun script tiers chargé.
 */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1] || '') : null;
}

export function HeatmapLoader() {
  const [config, setConfig] = useState<{ clarity?: string; hotjar?: string } | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    function check() {
      setAllowed(readCookie('pxs-consent') === 'all');
    }
    check();
    function onChange() { check(); }
    window.addEventListener('pxs:consent-change', onChange as any);
    return () => window.removeEventListener('pxs:consent-change', onChange as any);
  }, []);

  useEffect(() => {
    if (!allowed) return;
    if (config) return;
    fetch('/api/public/heatmap-config').then((r) => r.ok ? r.json() : null).then((j) => {
      if (j && (j.clarity || j.hotjar)) setConfig(j);
    }).catch(() => {});
  }, [allowed, config]);

  useEffect(() => {
    if (!allowed || !config) return;
    if (config.clarity && !(window as any)._pxsClarityLoaded) {
      (window as any)._pxsClarityLoaded = true;
      const id = config.clarity.replace(/[^a-zA-Z0-9]/g, '');
      if (id) {
        const s = document.createElement('script');
        s.async = true;
        s.text = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`;
        document.head.appendChild(s);
      }
    }
    if (config.hotjar && !(window as any)._pxsHotjarLoaded) {
      (window as any)._pxsHotjarLoaded = true;
      const id = config.hotjar.replace(/[^0-9]/g, '');
      if (id) {
        const s = document.createElement('script');
        s.async = true;
        s.text = `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${id},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`;
        document.head.appendChild(s);
      }
    }
  }, [allowed, config]);

  return null;
}
