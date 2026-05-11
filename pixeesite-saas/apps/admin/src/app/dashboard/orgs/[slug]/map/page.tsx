import { MapClient } from '@/components/MapClient';

export default async function MapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MapClient orgSlug={slug} />;
}
