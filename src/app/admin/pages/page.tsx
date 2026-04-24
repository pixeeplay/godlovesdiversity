import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PagesEditor } from '@/components/admin/PagesEditor';

export const dynamic = 'force-dynamic';

const PAGES = ['message', 'argumentaire', 'a-propos'];

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const sections = await prisma.section.findMany({
    where: { locale: 'fr' },
    orderBy: [{ pageSlug: 'asc' }, { order: 'asc' }]
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Pages riches</h1>
      <p className="text-zinc-400 mb-8">
        Édite les sections (titre, texte, image, vidéo, mise en page) de tes pages publiques.
        Les pages se rechargent dynamiquement après chaque modification.
      </p>
      <PagesEditor
        pages={PAGES}
        initialSections={sections.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString() }))}
      />
    </div>
  );
}
