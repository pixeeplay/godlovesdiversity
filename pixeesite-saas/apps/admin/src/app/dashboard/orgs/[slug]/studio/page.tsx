import { StudioClient } from '@/components/StudioClient';

export default async function StudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StudioClient orgSlug={slug} />;
}
