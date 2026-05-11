import { DropshippingClient } from '@/components/DropshippingClient';

export default async function DropshippingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DropshippingClient orgSlug={slug} />;
}
