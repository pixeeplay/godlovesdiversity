import { OrgLeadsClient } from '@/components/OrgLeadsClient';

export default async function LeadsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgLeadsClient orgSlug={slug} />;
}
