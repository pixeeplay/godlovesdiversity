import { PartnersClient } from '@/components/PartnersClient';

export default async function PartnersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PartnersClient orgSlug={slug} />;
}
