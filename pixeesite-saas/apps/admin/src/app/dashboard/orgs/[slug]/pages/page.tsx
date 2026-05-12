import { RichPagesClient } from '@/components/RichPagesClient';

export default async function PagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RichPagesClient orgSlug={slug} />;
}
