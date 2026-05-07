import { AdminShell } from '@/components/AdminShell';
import { Providers } from '@/components/Providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMenuPermissions } from '@/lib/menu-permissions';

export const metadata = {
  title: 'Back-office — parislgbt'
};
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // La redirection si pas connecté est gérée par middleware.ts (côté edge).
  // Ce layout NE redéfinit PLUS <html>/<body> — c'est le root layout qui s'en charge,
  // sinon Next.js 14 lève HierarchyRequestError ("only one element on document allowed")
  // et affiche une page noire en prod.
  const session = await getServerSession(authOptions);
  const role = ((session?.user as any)?.role as string) || 'EDITOR';
  const perms = await getMenuPermissions().catch(() => ({ hidden: [], editorHidden: [] }));

  return (
    <Providers>
      <AdminShell role={role} perms={perms}>{children}</AdminShell>
    </Providers>
  );
}
