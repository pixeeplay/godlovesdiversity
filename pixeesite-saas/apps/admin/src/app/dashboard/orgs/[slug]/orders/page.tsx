import { OrdersClient } from '@/components/OrdersClient';

export default async function OrdersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrdersClient orgSlug={slug} />;
}
