import { BrainVizClient } from '@/components/BrainVizClient';

export default async function Brain3dPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BrainVizClient orgSlug={slug} />;
}
