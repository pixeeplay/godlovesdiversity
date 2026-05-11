import { Brain3DClient } from '@/components/Brain3DClient';

export default async function Brain3dPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Brain3DClient orgSlug={slug} />;
}
