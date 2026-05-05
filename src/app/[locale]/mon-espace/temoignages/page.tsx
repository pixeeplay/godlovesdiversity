import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Video } from 'lucide-react';
import { MePageWrap, MeEmpty } from '@/components/me/MePageWrap';
export const dynamic = 'force-dynamic';
export default async function P() {
  const s = await getServerSession(authOptions);
  let items: any[] = [];
  try { items = await prisma.videoTestimony.findMany({ where: { uploaderId: (s?.user as any)?.id }, orderBy: { createdAt: 'desc' }, take: 50 }); } catch {}
  return (
    <MePageWrap title="Mes témoignages" count={items.length} emoji="🎬">
      {items.length === 0 ? <MeEmpty icon={Video} text="Aucun témoignage. Tu peux en créer depuis /participer." cta="Créer un témoignage" href="/participer" /> : (
        <div className="grid sm:grid-cols-2 gap-3">{items.map(t => (
          <article key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            {t.videoUrl && <video src={t.videoUrl} controls className="w-full rounded mb-2" />}
            <div className="font-bold text-sm">{t.title || 'Sans titre'}</div>
            <div className="text-[10px] text-zinc-400">Statut : <span className={t.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'}>{t.status}</span></div>
          </article>
        ))}</div>
      )}
    </MePageWrap>
  );
}
