import { BlogEditor } from '@/components/BlogEditor';

/**
 * News page reuses BlogEditor — Articles (tenant) is shared between blog and news.
 * Filtering by tag/status is done client-side via the existing editor.
 */
export default async function NewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogEditor orgSlug={slug} />;
}
