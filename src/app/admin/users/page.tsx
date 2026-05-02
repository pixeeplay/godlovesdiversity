import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UsersAdmin } from '@/components/admin/UsersAdmin';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const isAdmin = (s.user as any)?.role === 'ADMIN';
  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-red-300 mb-2">Accès refusé</h1>
          <p className="text-red-200/80">
            Cette page est réservée aux super-administrateurs (rôle ADMIN). Ton rôle actuel : <code>{(s.user as any)?.role || 'inconnu'}</code>.
          </p>
        </div>
      </div>
    );
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true,
      image: true, createdAt: true, updatedAt: true
    }
  });

  return (
    <UsersAdmin
      currentUserId={(s.user as any)?.id || ''}
      currentUserEmail={s.user?.email || ''}
      initialUsers={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString()
      }))}
    />
  );
}
