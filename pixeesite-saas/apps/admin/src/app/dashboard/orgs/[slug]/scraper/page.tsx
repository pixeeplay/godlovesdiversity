import { OrgScraperWorkbench } from '@/components/OrgScraperWorkbench';

export default async function ScraperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <OrgScraperWorkbench orgSlug={slug} />;
}
