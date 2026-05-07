import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { SectionRenderer } from '@/components/SectionRenderer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sections = await prisma.section.findMany({
    where: { pageSlug: 'argumentaire', locale, published: true },
    orderBy: { order: 'asc' }
  });

  if (sections.length === 0) {
    return (
      <div className="container-tight py-32 text-center text-white/60">
        Cette page est en cours de préparation. Revenez bientôt.
      </div>
    );
  }

  return <>{sections.map((s) => <SectionRenderer key={s.id} section={s} />)}</>;
}
