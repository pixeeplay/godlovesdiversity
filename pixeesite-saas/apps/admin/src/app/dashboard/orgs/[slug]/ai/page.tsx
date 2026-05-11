import { AiConfigClient } from '@/components/AiConfigClient';

export default async function AiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AiConfigClient orgSlug={slug} />;
}
