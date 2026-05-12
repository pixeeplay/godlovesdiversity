import { AiSettingsClient } from '@/components/AiSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AiSettingsClient orgSlug={slug} />;
}
