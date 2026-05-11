import { DomainsClient } from '@/components/DomainsClient';

export default async function DomainsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <DomainsClient orgSlug={slug} />;
}
