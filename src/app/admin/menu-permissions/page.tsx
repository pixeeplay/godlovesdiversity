import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getMenuPermissions } from '@/lib/menu-permissions';
import { MenuPermissionsEditor } from '@/components/admin/MenuPermissionsEditor';

export const dynamic = 'force-dynamic';

export default async function MenuPermissionsPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const role = (s.user as any)?.role;
  if (role && role !== 'ADMIN') {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-red-300 mb-2">Accès refusé</h1>
          <p className="text-red-200/80">
            Cette page est réservée aux super-administrateurs (rôle ADMIN). Ton rôle actuel : <code>{role || 'inconnu'}</code>.
          </p>
        </div>
      </div>
    );
  }

  const perms = await getMenuPermissions();
  return <MenuPermissionsEditor initial={perms} />;
}
