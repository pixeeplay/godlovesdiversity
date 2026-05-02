import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';
import { SharePhoto } from '@/components/SharePhoto';
import { PhotoComments } from '@/components/PhotoComments';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  CHURCH: '⛪ Église',
  MOSQUE: '🕌 Mosquée',
  SYNAGOGUE: '✡️ Synagogue',
  TEMPLE: '🛕 Temple',
  PUBLIC_SPACE: '🌆 Espace public',
  OTHER: '📍 Lieu'
};

export default async function PhotoPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { id } = await params;
  let photo: any = null;
  try {
    photo = await prisma.photo.findUnique({ where: { id } });
  } catch { photo = null; }
  if (!photo || photo.status !== 'PUBLISHED') notFound();
  const url = photo.storageKey ? publicUrl(photo.storageKey) : null;

  // URL absolue pour le partage
  const h = await headers();
  const host = h.get('host') || 'gld.pixeeplay.com';
  const proto = host.includes('localhost') ? 'http' : 'https';
  const shareUrl = `${proto}://${host}/photo/${photo.id}`;
  const shareTitle = photo.placeName ? `${photo.placeName} — God Loves Diversity` : 'God Loves Diversity';

  return (
    <div className="min-h-screen bg-black">
      <div className="container-wide py-6">
        <Link href="/galerie" className="inline-flex items-center gap-2 text-white/60 hover:text-brand-pink transition mb-4 text-sm">
          <ArrowLeft size={16} /> Retour à la galerie
        </Link>
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* IMAGE */}
          <div className="relative bg-zinc-900 rounded-2xl overflow-hidden">
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={photo.placeName || ''} className="w-full max-h-[80vh] object-contain bg-black" />
            ) : (
              <div className="aspect-square flex items-center justify-center text-white/40">Photo indisponible</div>
            )}
          </div>
          {/* INFOS */}
          <aside className="space-y-4">
            {photo.placeName && (
              <h1 className="text-2xl font-display font-bold text-white">{photo.placeName}</h1>
            )}
            {(photo.city || photo.country) && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <MapPin size={16} className="text-brand-pink" />
                {[photo.city, photo.country].filter(Boolean).join(', ')}
              </div>
            )}
            {photo.placeType && (
              <div className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs">
                {TYPE_LABEL[photo.placeType] || photo.placeType}
              </div>
            )}
            {photo.caption && (
              <blockquote className="text-white/85 italic border-l-4 border-brand-pink pl-4">
                « {photo.caption} »
              </blockquote>
            )}
            {photo.authorName && (
              <p className="text-white/60 text-sm">— {photo.authorName}</p>
            )}
            <div className="pt-4 border-t border-white/10">
              <SharePhoto url={shareUrl} title={shareTitle} />
            </div>
            <div className="text-xs text-white/40">
              Publié le {new Date(photo.createdAt).toLocaleDateString('fr-FR')}
            </div>
          </aside>
        </div>

        {/* COMMENTAIRES */}
        <div className="mt-12 max-w-3xl">
          <PhotoComments photoId={photo.id} />
        </div>
      </div>
    </div>
  );
}
