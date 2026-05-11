import { SitemapClient } from '@/components/SitemapClient';

export default async function SitemapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SitemapClient orgSlug={slug} />;
}
