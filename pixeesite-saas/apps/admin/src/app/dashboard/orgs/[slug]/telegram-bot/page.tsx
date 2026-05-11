import { TelegramBotClient } from '@/components/TelegramBotClient';

export default async function TelegramBotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TelegramBotClient orgSlug={slug} />;
}
