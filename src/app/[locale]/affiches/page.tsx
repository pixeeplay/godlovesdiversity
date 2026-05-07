import { useTranslations } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Download } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { PosterThumbnail } from '@/components/PosterThumbnail';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('posters');
  const posters = await prisma.poster.findMany({
    where: { published: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }]
  });

  return (
    <section className="container-tight py-20">
      <h1 className="font-display text-5xl font-black neon-title">{t('title')}</h1>
      <p className="text-white/70 mt-4 mb-10">{t('subtitle')}</p>

      {posters.length === 0 ? (
        <p className="text-white/50">Pas encore d'affiches disponibles.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {posters.map((p) => (
            <article key={p.id} className="stained-card overflow-hidden group">
              <div className="aspect-[3/4] bg-black relative overflow-hidden">
                <PosterThumbnail
                  pdfUrl={publicUrl(p.fileKey)}
                  thumbnailUrl={p.thumbnailKey ? publicUrl(p.thumbnailKey) : null}
                  format={p.format}
                  alt={p.title}
                  className="group-hover:scale-105 transition"
                />
                <div className="absolute top-3 left-3 bg-brand-pink text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                  {p.format}
                </div>
              </div>
              <div className="p-4">
                <div className="font-bold">{p.title}</div>
                {p.size && <div className="text-xs text-white/50">{p.size}</div>}
                {p.description && <p className="text-sm text-white/70 mt-2 line-clamp-2">{p.description}</p>}
                <a
                  href={publicUrl(p.fileKey)}
                  download
                  className="mt-4 btn-primary text-sm w-full"
                >
                  <Download size={14} /> {t('download')}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-6">
        <h3 className="font-bold mb-3">{t('tip_title')}</h3>
        <ul className="space-y-2 text-white/80 list-disc list-inside">
          <li>{t('tip1')}</li>
          <li>{t('tip2')}</li>
          <li>{t('tip3')}</li>
        </ul>
      </div>
    </section>
  );
}
