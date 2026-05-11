import { CouponsClient } from '@/components/CouponsClient';

export default async function CouponsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CouponsClient orgSlug={slug} />;
}
