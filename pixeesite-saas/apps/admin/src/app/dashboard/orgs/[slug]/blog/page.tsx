import { BlogEditor } from '@/components/BlogEditor';

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogEditor orgSlug={slug} />;
}
