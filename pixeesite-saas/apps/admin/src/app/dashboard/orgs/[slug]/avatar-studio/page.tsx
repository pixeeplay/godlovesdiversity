import { AvatarStudioClient } from '@/components/AvatarStudioClient';

export default async function AvatarStudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AvatarStudioClient orgSlug={slug} />;
}
