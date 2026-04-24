import '../globals.css';
import { AdminShell } from '@/components/AdminShell';
import { Providers } from '@/components/Providers';

export const metadata = { title: 'Back-office — God Loves Diversity' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="bg-zinc-950">
      <body className="min-h-screen text-white">
        <Providers>
          <AdminShell>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
