import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { NewsManager } from '@/components/admin/NewsManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Actualités & vidéos</h1>
      <p className="text-zinc-400 mb-8">
        Crée des actus, témoignages ou vidéos. Publiées, elles apparaissent dans le carrousel "Actualités" de la home.
      </p>
      <NewsManager initial={articles.map((a) => ({ ...a, createdAt: a.createdAt.toISOString(), publishedAt: a.publishedAt?.toISOString() || null }))} />
    </div>
  );
}
