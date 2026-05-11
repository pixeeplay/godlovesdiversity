import { IntegrationsClient } from '@/components/IntegrationsClient';

export default async function IntegrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <IntegrationsClient orgSlug={slug} />;
}
