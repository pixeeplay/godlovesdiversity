import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductDetail } from '@/components/ProductDetail';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: any = null;
  try {
    product = await prisma.product.findUnique({ where: { slug } });
  } catch { product = null; }
  if (!product || !product.published) notFound();

  return (
    <main className="min-h-screen py-12">
      <div className="container-wide">
        <Link href="/boutique" className="inline-flex items-center gap-2 text-white/60 hover:text-brand-pink mb-6 text-sm">
          <ArrowLeft size={16} /> Retour à la boutique
        </Link>
        <ProductDetail product={product} />
      </div>
    </main>
  );
}
