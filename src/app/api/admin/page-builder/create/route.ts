import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/page-builder/create
 * Body: { slug: 'ma-page', title?: 'Ma page', subtitle?: '...', emoji?: '✨' }
 *
 * Crée une page DB-only (sans page Next.js dédiée) qui sera rendue via
 * la route catch-all [...page]/page.tsx. La page démarre avec un bloc
 * hero pré-rempli pour aider l'admin à démarrer.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  let slug = (body.slug as string)?.trim().toLowerCase().replace(/[^a-z0-9-/]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!slug) return NextResponse.json({ error: 'slug-required' }, { status: 400 });
  if (slug.startsWith('admin') || slug.startsWith('api/')) {
    return NextResponse.json({ error: 'reserved-slug' }, { status: 400 });
  }

  const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
  if (existing > 0) {
    return NextResponse.json({ error: 'slug-already-exists', existing }, { status: 409 });
  }

  const title = (body.title as string) || slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Nouvelle page';
  const subtitle = (body.subtitle as string) || '';
  const emoji = (body.emoji as string) || '✨';

  // Crée 3 blocs de départ : hero + text + cta
  const seedBlocks = [
    {
      type: 'parallax-hero',
      width: 'full',
      effect: 'fade-up',
      effectDelay: 0,
      data: {
        title: `${emoji} ${title}`,
        subtitle,
        ctaLabel: 'Découvrir',
        ctaHref: '#contenu',
        bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)',
        floatingText: title.toUpperCase().slice(0, 12),
        height: '70vh',
        overlayColor: 'rgba(0,0,0,0.25)'
      }
    },
    {
      type: 'text',
      width: 'full',
      effect: 'fade-up',
      effectDelay: 100,
      data: {
        html: `<h2 id="contenu">À toi de jouer ✨</h2><p>Cette page a été créée par le Page Builder. Tu peux maintenant :</p><ul><li><strong>Importer du contenu existant</strong> via le bouton "Importer la page actuelle"</li><li><strong>Générer avec IA</strong> en décrivant ce que tu veux</li><li><strong>Ajouter des blocs</strong> manuellement (text, image, video, parallax-slider…)</li></ul>`
      }
    },
    {
      type: 'cta',
      width: 'full',
      effect: 'bounce-in',
      effectDelay: 200,
      data: { label: 'Modifier cette page', href: `/admin/page-builder/${slug}` }
    }
  ];

  for (let i = 0; i < seedBlocks.length; i++) {
    await (prisma as any).pageBlock.create({
      data: {
        pageSlug: slug,
        position: i,
        width: seedBlocks[i].width,
        height: 'auto',
        type: seedBlocks[i].type,
        data: seedBlocks[i].data,
        effect: seedBlocks[i].effect,
        effectDelay: seedBlocks[i].effectDelay,
        visible: true
      }
    });
  }

  return NextResponse.json({ ok: true, slug, blocksCount: seedBlocks.length });
}

/**
 * DELETE /api/admin/page-builder/create?slug=foo
 * Supprime tous les blocs d'une page (utile pour ré-init).
 */
export async function DELETE(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug-required' }, { status: 400 });
  const result = await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
