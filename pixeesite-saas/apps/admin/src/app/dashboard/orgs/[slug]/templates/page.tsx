import { TemplatesMarketplace } from '@/components/TemplatesMarketplace';

export default async function TemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TemplatesMarketplace orgSlug={slug} />;
}
