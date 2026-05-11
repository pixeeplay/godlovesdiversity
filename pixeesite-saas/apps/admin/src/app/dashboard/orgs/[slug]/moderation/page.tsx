import { ModerationClient } from '@/components/ModerationClient';

export default async function ModerationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ModerationClient orgSlug={slug} />;
}
