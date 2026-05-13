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
  title: {
    default: 'parislgbt — Communauté LGBT à Paris et en France',
    template: '%s | parislgbt'
  },
  description:
    'Annuaire de 3 300+ lieux LGBT-friendly, agenda Pride 365j/an, santé, associations. Indépendant, sans publicité, écrit par et pour la communauté.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://parislgbt.com'),
  keywords: ['LGBT', 'queer', 'Paris', 'France', 'annuaire', 'bars', 'clubs', 'saunas', 'Pride', 'PrEP', 'associations LGBT'],
  authors: [{ name: 'parislgbt' }],
  openGraph: {
    title: 'parislgbt — Communauté LGBT à Paris et en France',
    description: 'Annuaire de 3 300+ lieux LGBT-friendly, agenda, santé, associations.',
    type: 'website',
    locale: 'fr_FR',
    siteName: 'parislgbt',
    images: [{ url: '/og-default.svg', width: 1200, height: 630, alt: 'parislgbt' }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'parislgbt — Communauté LGBT',
    description: 'Annuaire de 3 300+ lieux LGBT-friendly.',
    images: ['/og-default.svg']
  },
  robots: { index: true, follow: true }
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
