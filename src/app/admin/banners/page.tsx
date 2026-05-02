import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { BannersManager } from '@/components/admin/BannersManager';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { GalleryHorizontalEnd, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const banners = await prisma.banner.findMany({
    where: { locale: 'fr' },
    orderBy: { order: 'asc' }
  });
  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <AdminPageHeader
        icon={GalleryHorizontalEnd}
        gradient="from-violet-500 to-purple-600"
        title="Bannières du hero"
        subtitle="Bannières qui défilent automatiquement (toutes les 7 secondes) dans le hero de la home. Chacune peut avoir son image/vidéo, ses CTA, sa couleur d'accent."
        actions={[
          { href: '/', label: 'Voir le site', icon: ExternalLink, external: true, variant: 'primary' }
        ]}
      />
      <BannersManager initial={banners.map((b) => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }))} />
    </div>
  );
}
