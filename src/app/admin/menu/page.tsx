import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MenuManager } from '@/components/admin/MenuManager';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Menu as MenuIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const items = await prisma.menuItem.findMany({
    where: { locale: 'fr' },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }]
  });
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <AdminPageHeader
        icon={MenuIcon}
        gradient="from-zinc-500 to-zinc-700"
        title="Menu de navigation"
        subtitle="Édite les éléments du menu principal du site. Tu peux créer des sous-menus en les rattachant à un parent."
      />
      <MenuManager initial={items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString(), updatedAt: i.updatedAt.toISOString() }))} />
    </div>
  );
}
