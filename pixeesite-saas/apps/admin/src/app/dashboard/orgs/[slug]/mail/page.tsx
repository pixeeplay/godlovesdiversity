import { MailWebClient } from '@/components/MailWebClient';

export default async function MailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MailWebClient orgSlug={slug} />;
}
