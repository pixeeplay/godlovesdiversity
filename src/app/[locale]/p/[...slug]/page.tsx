import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PageBlocksRenderer } from '@/components/PageBlocksRenderer';
import { getPageMeta } from '@/lib/page-catalog';

export const dynamic = 'force-dynamic';

/**
 * Catch-all pour pages DB-only créées via Page Builder.
 * URL : /[locale]/p/[slug]
 *
 * Ex : /fr/p/ma-nouvelle-page
 *
 * Si aucun bloc n'est trouvé pour ce slug → 404.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugStr = (slug || []).join('/');
  const meta = getPageMeta(slugStr);
  return { title: `${meta.label} · GLD` };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugStr = (slug || []).join('/');
  if (!slugStr) notFound();

  const count = await (prisma as any).pageBlock.count({
    where: { pageSlug: slugStr, visible: true }
  }).catch(() => 0);

  if (count === 0) notFound();

  return (
    <main>
      <PageBlocksRenderer pageSlug={slugStr} />
    </main>
  );
}
