import { prisma } from '@/lib/prisma';
import { PageBlocksClient } from './PageBlocksClient';

/**
 * Rendu des blocs d'une page éditée via /admin/page-builder.
 * À insérer dans la page server component publique :
 *   <PageBlocksRenderer pageSlug="home" />
 *
 * Charge les blocs visibles depuis la DB et les passe au client pour les animations.
 */
export async function PageBlocksRenderer({ pageSlug }: { pageSlug: string }) {
  const blocks = await prisma.pageBlock.findMany({
    where: { pageSlug, visible: true },
    orderBy: { position: 'asc' },
    select: {
      id: true, position: true, width: true, height: true,
      type: true, data: true, effect: true, effectDelay: true
    }
  }).catch(() => []);

  if (blocks.length === 0) return null;
  return <PageBlocksClient blocks={blocks as any} />;
}
