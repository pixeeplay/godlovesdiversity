import './globals.css';
import type { Metadata, Viewport } from 'next';

// Script anti-flash inliné directement (évite import depuis fichier 'use client')
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('gld-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.classList.add(t);
  } catch(e){ document.documentElement.classList.add('dark'); }
})();
`.trim();

export const metadata: Metadata = {
  title: 'parislgbt',
  description:
    'Plateforme communautaire LGBTQIA+ — Paris et France. Indépendante, sans publicité.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'parislgbt',
    description: 'Dieu est amour. La foi se conjugue au pluriel.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className="min-h-screen text-white antialiased"
        style={{
          backgroundColor: '#09090b',
          minHeight: '100dvh',
          // @ts-ignore — vendor property
          WebkitTapHighlightColor: 'transparent'
        }}
      >
        {children}
      </body>
    </html>
  );
}
