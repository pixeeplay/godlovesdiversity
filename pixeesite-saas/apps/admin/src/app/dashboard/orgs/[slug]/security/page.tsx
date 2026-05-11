import { SecurityClient } from '@/components/SecurityClient';

export default async function SecurityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SecurityClient orgSlug={slug} />;
}
