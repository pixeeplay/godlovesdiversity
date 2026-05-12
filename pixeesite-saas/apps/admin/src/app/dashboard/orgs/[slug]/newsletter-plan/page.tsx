import { NewsletterPlanClient } from '@/components/NewsletterPlanClient';

export default async function NewsletterPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <NewsletterPlanClient orgSlug={slug} />;
}
