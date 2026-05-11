import { BannersClient } from '@/components/BannersClient';

export default async function BannersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BannersClient orgSlug={slug} />;
}
