import { OrgTasksBoardClient } from '@/components/OrgTasksBoardClient';

export default async function TasksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgTasksBoardClient orgSlug={slug} />;
}
