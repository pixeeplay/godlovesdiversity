import { PlaygroundClient } from '@/components/PlaygroundClient';

export const dynamic = 'force-dynamic';

export default async function PlaygroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PlaygroundClient orgSlug={slug} />;
}
