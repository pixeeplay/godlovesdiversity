import { BulkImportClient } from '@/components/BulkImportClient';

export default async function BulkImportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BulkImportClient orgSlug={slug} />;
}
