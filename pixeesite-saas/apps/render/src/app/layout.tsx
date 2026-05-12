import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pixeesite',
  description: 'Built with Pixeesite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Préconnexion Google Fonts — les <link> spécifiques sont injectés
            par <GoogleFontsLoader> dans la page (selon theme.fontHeadingName / fontBodyName). */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
