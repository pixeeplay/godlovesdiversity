import '../globals.css';
import { Providers } from '@/components/Providers';
import { ConnectShell } from '@/components/connect/ConnectShell';

export const metadata = { title: 'GLD Connect — réseau social inclusif' };
export const dynamic = 'force-dynamic';

export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-zinc-950">
      <body className="bg-zinc-950">
        <Providers>
          <ConnectShell>{children}</ConnectShell>
        </Providers>
      </body>
    </html>
  );
}
