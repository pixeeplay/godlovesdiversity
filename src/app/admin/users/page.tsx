import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function UsersPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-2">Utilisateurs admin</h1>
      <p className="text-zinc-400 mb-6">Comptes ayant accès au back-office.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-left">
            <th className="py-2">Email</th>
            <th>Nom</th>
            <th>Rôle</th>
            <th>Créé le</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-zinc-800">
              <td className="py-3">{u.email}</td>
              <td>{u.name || '—'}</td>
              <td>
                <span className="text-xs px-2 py-1 rounded bg-brand-pink/10 text-brand-pink">{u.role}</span>
              </td>
              <td>{u.createdAt.toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
