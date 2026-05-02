import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductsAdmin } from '@/components/admin/ProductsAdmin';
import Link from 'next/link';

export default async function AdminShopPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const products = await prisma.product.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  const ordersCount = await prisma.order.count().catch(() => 0);

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-display font-bold">Boutique</h1>
        <Link href="/admin/shop/orders" className="text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full">
          Commandes ({ordersCount})
        </Link>
      </div>
      <p className="text-zinc-400 mb-6">
        Gestion des produits dérivés. Paiement via Stripe (CB) ou Square (Apple Pay).
        Configure les clés dans <Link href="/admin/settings" className="underline">Paramètres</Link>.
      </p>
      <ProductsAdmin initialItems={products as any} />
    </div>
  );
}
