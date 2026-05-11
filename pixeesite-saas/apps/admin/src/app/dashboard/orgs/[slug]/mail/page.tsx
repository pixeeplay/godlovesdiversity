import { MailClient } from '@/components/MailClient';

export default async function MailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MailClient orgSlug={slug} />;
}
