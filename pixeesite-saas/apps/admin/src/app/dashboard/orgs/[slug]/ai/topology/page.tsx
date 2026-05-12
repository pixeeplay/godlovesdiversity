import { AiTopologyPageClient } from '@/components/AiTopologyPageClient';

export const dynamic = 'force-dynamic';

export default async function AiTopologyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AiTopologyPageClient orgSlug={slug} />;
}
