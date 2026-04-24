import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MenuManager } from '@/components/admin/MenuManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const items = await prisma.menuItem.findMany({
    where: { locale: 'fr' },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }]
  });
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-2">Menu de navigation</h1>
      <p className="text-zinc-400 mb-8">
        Édite les éléments du menu principal. Tu peux créer des sous-menus en les rattachant à un parent.
      </p>
      <MenuManager initial={items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() }))} />
    </div>
  );
}
