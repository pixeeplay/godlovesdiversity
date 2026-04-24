import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { PostersManager } from '@/components/admin/PostersManager';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const posters = await prisma.poster.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-display font-bold mb-2">Affiches</h1>
      <p className="text-zinc-400 mb-8">
        Téléverse tes affiches (PDF + image preview optionnelle).
        Elles apparaissent automatiquement sur la page <code>/affiches</code> du site.
      </p>
      <PostersManager
        initial={posters.map((p) => ({
          ...p,
          fileUrl: publicUrl(p.fileKey),
          thumbnailUrl: p.thumbnailKey ? publicUrl(p.thumbnailKey) : null,
          createdAt: p.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
