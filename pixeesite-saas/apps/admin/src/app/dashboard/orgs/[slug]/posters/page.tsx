import { PostersClient } from '@/components/PostersClient';

export default async function PostersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PostersClient orgSlug={slug} />;
}
