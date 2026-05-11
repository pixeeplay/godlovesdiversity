import { EventsClient } from '@/components/EventsClient';

export default async function EventsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <EventsClient orgSlug={slug} />;
}
