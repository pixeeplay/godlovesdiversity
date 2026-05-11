import { YoutubeClient } from '@/components/YoutubeClient';

export default async function YoutubePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <YoutubeClient orgSlug={slug} />;
}
