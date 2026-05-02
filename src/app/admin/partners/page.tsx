import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PartnersAdmin } from '@/components/admin/PartnersAdmin';

export default async function AdminPartnersPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const items = await prisma.partner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Partenaires</h1>
      <p className="text-zinc-400 mb-6">
        Liens, logos et descriptions des associations, lieux de culte, médias et créateurs partenaires.
        Affichés sur la home et la page <code>/partenaires</code>.
      </p>
      <PartnersAdmin initialItems={items} />
    </div>
  );
}
