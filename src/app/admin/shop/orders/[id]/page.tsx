import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OrderEditor } from '@/components/admin/OrderEditor';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } }
  });
  if (!order) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/shop/orders" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-4 text-sm">
        <ArrowLeft size={16} /> Toutes les commandes
      </Link>
      <h1 className="text-2xl font-display font-bold mb-6">Commande #{order.id.slice(0, 8).toUpperCase()}</h1>
      <OrderEditor initial={order as any} />
    </div>
  );
}
