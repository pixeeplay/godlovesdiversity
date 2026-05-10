import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pixeesite',
  description: 'Built with Pixeesite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
