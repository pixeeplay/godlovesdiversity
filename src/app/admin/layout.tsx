import '../globals.css';
import { AdminShell } from '@/components/AdminShell';
import { Providers } from '@/components/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMenuPermissions } from '@/lib/menu-permissions';

export const metadata = { title: 'Back-office — God Loves Diversity' };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = ((session?.user as any)?.role as string) || 'EDITOR';
  const perms = await getMenuPermissions().catch(() => ({ hidden: [], editorHidden: [] }));

  return (
    <html lang="fr" className="bg-zinc-950">
      <body className="min-h-screen text-white">
        <Providers>
          <AdminShell role={role} perms={perms}>{children}</AdminShell>
        </Providers>
      </body>
    </html>
  );
}
