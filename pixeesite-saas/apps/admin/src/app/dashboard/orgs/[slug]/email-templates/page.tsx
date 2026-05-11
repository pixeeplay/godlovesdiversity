import { OrgEmailTemplatesClient } from '@/components/OrgEmailTemplatesClient';

export default async function EmailTemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgEmailTemplatesClient orgSlug={slug} />;
}
