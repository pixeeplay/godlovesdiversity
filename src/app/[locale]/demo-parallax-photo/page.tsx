import { PageBlocksRenderer } from '@/components/PageBlocksRenderer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo Parallax · GLD' };

/**
 * Page de démo générée via Page Builder + IA.
 * Tout son contenu vient de la table PageBlock (slug=demo-parallax-photo).
 *
 * Pour la créer/recréer : POST /api/admin/page-builder/seed-demo
 * ou via le bouton 'Tout importer' dans /admin/page-builder.
 */
export default function DemoParallaxPage() {
  return (
    <main>
      <PageBlocksRenderer pageSlug="demo-parallax-photo" />
    </main>
  );
}
