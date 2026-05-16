import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { SectionRenderer } from '@/components/SectionRenderer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GLD V1 — /le-message
 * Fusion de l'ancien /message + /argumentaire. On charge les sections CMS des
 * deux slugs (message d'abord, puis argumentaire) et on les concatène.
 * Le client fournira le texte définitif plus tard ; la page est prête à recevoir.
 */
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [messageSections, argSections] = await Promise.all([
    prisma.section.findMany({
      where: { pageSlug: 'message', locale, published: true },
      orderBy: { order: 'asc' }
    }).catch(() => []),
    prisma.section.findMany({
      where: { pageSlug: 'argumentaire', locale, published: true },
      orderBy: { order: 'asc' }
    }).catch(() => [])
  ]);

  const sections = [...messageSections, ...argSections];

  if (sections.length === 0) {
    return (
      <article className="container-tight py-32">
        <p className="text-xs uppercase tracking-[0.4em] text-brand-pink mb-6">Le Message</p>
        <h1 className="font-display text-4xl md:text-6xl font-black leading-[1.05] tracking-tight neon-title">
          L'amour, la justice, la compassion.
        </h1>
        <p className="mt-8 text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
          Au cœur des grandes traditions spirituelles, un même fil rouge : l'amour universel.
          Aucune lecture n'est définitive — la foi se conjugue au pluriel.
        </p>
        <div className="mt-12 prose prose-invert max-w-2xl">
          <p className="text-white/70">
            Cette page est en cours de rédaction. Le texte définitif du Message
            sera publié prochainement. En attendant, découvre la galerie et la
            communauté qui font vivre le mouvement.
          </p>
        </div>
      </article>
    );
  }

  return <>{sections.map((s) => <SectionRenderer key={s.id} section={s} />)}</>;
}
