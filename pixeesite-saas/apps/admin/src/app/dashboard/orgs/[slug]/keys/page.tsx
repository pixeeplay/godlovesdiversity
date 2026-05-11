import { OrgSecretsClient } from '@/components/OrgSecretsClient';

export default async function KeysPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgSecretsClient orgSlug={slug} />;
}
