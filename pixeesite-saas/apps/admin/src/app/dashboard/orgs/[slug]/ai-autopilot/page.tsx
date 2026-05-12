import { AiAutopilotClient } from '@/components/AiAutopilotClient';

export const dynamic = 'force-dynamic';

export default async function AiAutopilotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AiAutopilotClient orgSlug={slug} />;
}
