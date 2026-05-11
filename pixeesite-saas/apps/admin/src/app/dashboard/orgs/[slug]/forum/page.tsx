import { ForumAdminClient } from '@/components/ForumAdminClient';

export default async function ForumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ForumAdminClient orgSlug={slug} />;
}
