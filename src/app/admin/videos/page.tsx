import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VideosManager } from '@/components/admin/VideosManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const videos = await prisma.youtubeVideo.findMany({ orderBy: { order: 'asc' } });
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-3xl font-display font-bold mb-2">Vidéos YouTube</h1>
      <p className="text-zinc-400 mb-8">
        Colle l'URL d'une vidéo YouTube — on extrait l'ID automatiquement.
        Les vidéos publiées apparaissent dans le carrousel "Le mouvement en images" sur la home.
      </p>
      <VideosManager initial={videos.map((v) => ({ ...v, createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString() }))} />
    </div>
  );
}
