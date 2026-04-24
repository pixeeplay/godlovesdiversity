import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'God Loves Diversity',
  description:
    'Mouvement interreligieux pour réconcilier foi et diversité. Dieu est amour.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'God Loves Diversity',
    description: 'Dieu est amour. La foi se conjugue au pluriel.',
    type: 'website'
  }
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
