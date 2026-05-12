import { TranslationsClient } from '@/components/TranslationsClient';

export default async function TranslationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TranslationsClient orgSlug={slug} />;
}
