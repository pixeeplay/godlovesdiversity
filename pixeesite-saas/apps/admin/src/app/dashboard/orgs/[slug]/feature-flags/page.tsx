import { FeatureFlagsClient } from '@/components/FeatureFlagsClient';

export default async function FeatureFlagsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <FeatureFlagsClient orgSlug={slug} />;
}
