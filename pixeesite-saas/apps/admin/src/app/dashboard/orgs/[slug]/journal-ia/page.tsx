import { JournalIaClient } from '@/components/JournalIaClient';

export const dynamic = 'force-dynamic';

export default async function JournalIaAdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <JournalIaClient orgSlug={slug} />;
}
