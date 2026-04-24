import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';
import nextDynamic from 'next/dynamic';

const WorldMap = nextDynamic(() => import('@/components/admin/WorldMap').then((m) => m.WorldMap), {
  ssr: false
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MapPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const photos = await prisma.photo.findMany({
    where: { latitude: { not: null }, longitude: { not: null }, status: { in: ['APPROVED', 'PENDING'] } },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });

  const markers = photos.map((p) => ({
    id: p.id,
    lat: p.latitude!,
    lon: p.longitude!,
    label: p.placeName || p.city || 'Sans nom',
    placeType: p.placeType || undefined,
    imageUrl: publicUrl(p.storageKey)
  }));

  // Compteurs par type
  const counts = photos.reduce<Record<string, number>>((acc, p) => {
    const k = p.placeType || 'OTHER';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <h1 className="text-3xl font-display font-bold mb-2">Carte mondiale</h1>
      <p className="text-zinc-400 mb-6">
        {photos.length} photo(s) géolocalisée(s) — chaque marqueur peut être cliqué pour voir l'image.
      </p>

      <div className="flex flex-wrap gap-3 mb-6 text-sm">
        <Pill color="#FF1493" label="⛪ Église" n={counts.CHURCH || 0} />
        <Pill color="#22C55E" label="🕌 Mosquée" n={counts.MOSQUE || 0} />
        <Pill color="#3B82F6" label="✡️ Synagogue" n={counts.SYNAGOGUE || 0} />
        <Pill color="#FB923C" label="🛕 Temple" n={counts.TEMPLE || 0} />
        <Pill color="#A855F7" label="🌆 Espace public" n={counts.PUBLIC_SPACE || 0} />
        <Pill color="#94A3B8" label="📍 Autre" n={counts.OTHER || 0} />
      </div>

      <WorldMap markers={markers} height={600} />
    </div>
  );
}

function Pill({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-zinc-300">{label}</span>
      <span className="text-zinc-500">{n}</span>
    </div>
  );
}
