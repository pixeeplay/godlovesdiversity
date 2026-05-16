import type { Metadata } from 'next';
import './globals.css';
import { CookieConsent } from '@/components/CookieConsent';
import { HeatmapLoader } from '@/components/HeatmapLoader';

export const metadata: Metadata = {
  title: 'Pixeesite',
  description: 'Built with Pixeesite',
};

/**
 * Root layout — injecte CSS view-transitions, magnetic buttons, CookieConsent, HeatmapLoader.
 *
 * - View Transitions API : @view-transition pour animer les transitions de page.
 * - Magnetic buttons : tout élément `.pxs-magnetic` est attiré par le curseur.
 * - CookieConsent : bannière RGPD globale (cookie pxs-consent).
 * - HeatmapLoader : Microsoft Clarity / Hotjar opt-in si consenti.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <style dangerouslySetInnerHTML={{ __html: `
          @view-transition { navigation: auto }
          ::view-transition-old(root), ::view-transition-new(root) {
            animation-duration: .35s;
            animation-timing-function: cubic-bezier(.2,.8,.2,1);
          }
          .pxs-magnetic {
            display: inline-flex; position: relative; transition: transform .25s cubic-bezier(.2,.8,.2,1);
            will-change: transform;
          }
          .pxs-magnetic > * { transition: transform .25s cubic-bezier(.2,.8,.2,1); }
          .pxs-magnetic:hover { transform: translate3d(var(--mx,0),var(--my,0),0) scale(1.04); }
          @media (prefers-reduced-motion: reduce) {
            .pxs-magnetic, .pxs-magnetic > * { transition: none !important; transform: none !important; }
            ::view-transition-old(root), ::view-transition-new(root) { animation: none !important; }
          }
        `}} />
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            document.addEventListener('mousemove', function(e){
              var els = document.querySelectorAll('.pxs-magnetic');
              for (var i=0;i<els.length;i++){
                var el = els[i]; var r = el.getBoundingClientRect();
                var cx = r.left + r.width/2, cy = r.top + r.height/2;
                var dx = e.clientX - cx, dy = e.clientY - cy;
                var dist = Math.hypot(dx,dy);
                if (dist < 140) {
                  var k = (1 - dist/140) * 0.25;
                  el.style.setProperty('--mx', (dx*k)+'px');
                  el.style.setProperty('--my', (dy*k)+'px');
                } else {
                  el.style.setProperty('--mx','0px');
                  el.style.setProperty('--my','0px');
                }
              }
            }, { passive: true });
          }
        `}} />
      </head>
      <body>
        {children}
        <CookieConsent />
        <HeatmapLoader />
      </body>
    </html>
  );
}
