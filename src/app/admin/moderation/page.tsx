import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ModerationGrid } from '@/components/ModerationGrid';
import { publicUrl } from '@/lib/storage';

export default async function ModerationPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const sp = await searchParams;
  const status = (sp.status as any) || 'PENDING';

  const photos = await prisma.photo.findMany({
    where: { status },
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  return (
    <div className="p-8">
      <h1 className="text-3xl font-display font-bold mb-2">Modération</h1>
      <p className="text-zinc-400 mb-6">Validez, rejetez ou supprimez les photos soumises.</p>

      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'].map((st) => (
          <a
            key={st}
            href={`/admin/moderation?status=${st}`}
            className={`px-4 py-2 rounded-full text-sm border transition
              ${status === st ? 'border-brand-pink text-brand-pink' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}
          >
            {st}
          </a>
        ))}
      </div>

      <ModerationGrid
        photos={photos.map((p) => ({
          ...p,
          url: publicUrl(p.storageKey),
          createdAt: p.createdAt.toISOString()
        }))}
      />
    </div>
  );
}
