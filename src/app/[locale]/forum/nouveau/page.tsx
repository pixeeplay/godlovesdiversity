import { prisma } from '@/lib/prisma';
import { NewThreadForm } from '@/components/NewThreadForm';

export const dynamic = 'force-dynamic';

export default async function NewThreadPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const sp = await searchParams;
  let categories: any[] = [];
  try { categories = await prisma.forumCategory.findMany({ orderBy: { order: 'asc' } }); } catch { /* migration */ }

  return (
    <main className="container-wide py-12 max-w-3xl">
      <h1 className="font-display font-bold text-3xl mb-2">Nouveau sujet</h1>
      <p className="text-zinc-400 text-sm mb-6">
        Partage avec respect. Tout message haineux, agressif ou hors-sujet sera modéré.
      </p>
      <NewThreadForm categories={categories} preselected={sp.cat} />
    </main>
  );
}
