import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { MonEspaceSidebar } from '@/components/MonEspaceSidebar';

export default async function MonEspaceLayout({ children }: { children: React.ReactNode }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/mon-espace');
  // Admins → vrai back-office
  if (['ADMIN', 'EDITOR'].includes((s.user as any).role)) redirect('/admin');

  return (
    <div className="container-wide py-6 max-w-7xl">
      <div className="grid lg:grid-cols-[240px_1fr] gap-5">
        <aside className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <MonEspaceSidebar />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
