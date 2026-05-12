import { LegalAssistantClient } from '@/components/LegalAssistantClient';

export default async function LegalAssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <LegalAssistantClient orgSlug={slug} />;
}
