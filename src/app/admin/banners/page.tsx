import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BannersManager } from '@/components/admin/BannersManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const banners = await prisma.banner.findMany({
    where: { locale: 'fr' },
    orderBy: { order: 'asc' }
  });
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Bannières du hero</h1>
      <p className="text-zinc-400 mb-8">
        Bannières qui défilent automatiquement (toutes les 7 secondes) dans le hero de la home.
        Chacune peut avoir son image/vidéo, ses CTA, sa couleur d'accent.
      </p>
      <BannersManager initial={banners.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }))} />
    </div>
  );
}
