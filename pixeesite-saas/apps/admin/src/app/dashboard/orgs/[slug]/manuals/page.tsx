import { ManualsClient } from '@/components/ManualsClient';

export const dynamic = 'force-dynamic';

export default async function ManualsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ManualsClient orgSlug={slug} />;
}
