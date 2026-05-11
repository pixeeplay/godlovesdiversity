import { OrderDetailClient } from '@/components/OrderDetailClient';

export default async function OrderDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  return <OrderDetailClient orgSlug={slug} orderId={id} />;
}
