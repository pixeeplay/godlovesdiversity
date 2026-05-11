import { ShopClient } from '@/components/ShopClient';

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ShopClient orgSlug={slug} />;
}
