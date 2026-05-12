import { SocialCalendarClient } from '@/components/SocialCalendarClient';

export default async function SocialCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SocialCalendarClient orgSlug={slug} />;
}
