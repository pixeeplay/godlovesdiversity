import { KnowledgeAdminClient } from '@/components/KnowledgeAdminClient';

export default async function RagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <KnowledgeAdminClient orgSlug={slug} />;
}
