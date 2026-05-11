import { NewsletterEditor } from '@/components/NewsletterEditor';

export default async function NewsletterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NewsletterEditor orgSlug={slug} />;
}
